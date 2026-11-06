import { and, eq, inArray, lt } from "drizzle-orm";
import { db } from "../lib/db";
import { checkRuns, trackers } from "../lib/db/schema";
import { dateInMinsk } from "../lib/format";
import { log } from "../lib/log";
import { sendOwnerMessage } from "../lib/notify/telegram";
import { fetchRouteHtml, RateLimitedError } from "../lib/rw/client";
import { BrokenPageError, parseRoute } from "../lib/rw/parser";
import type { RouteQuery, TrainInfo } from "../lib/rw/types";
import { SETTING, getSetting, setSetting } from "../lib/settings";
import { checkTracker, type Tracker } from "./check";

const RATE_LIMIT_PAUSE_MS = 10 * 60_000;
const PARSE_ALERT_COOLDOWN_MS = 60 * 60_000;
const MAX_JITTER_MS = 5_000;

// Route key -> timestamp until which requests for it are suspended.
const pausedRoutes = new Map<string, number>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const routeKey = ({ from, to, date }: RouteQuery) => `${from}|${to}|${date}`;

function isDue(tracker: Tracker, now: Date): boolean {
  if (tracker.forceCheckAt) return true;
  if (!tracker.lastAttemptAt) return true;
  return now.getTime() - tracker.lastAttemptAt.getTime() >= tracker.intervalSec * 1000;
}

function recordRun(key: string, startedAt: Date, status: string, trainsFound: number | null, error?: string) {
  db.insert(checkRuns)
    .values({
      routeKey: key,
      startedAt,
      durationMs: Date.now() - startedAt.getTime(),
      status,
      trainsFound,
      error: error ?? null,
    })
    .run();
}

async function alertBrokenPage(query: RouteQuery) {
  const lastAlert = Number(getSetting(SETTING.lastParseAlertAt) ?? 0);
  if (Date.now() - lastAlert < PARSE_ALERT_COOLDOWN_MS) return;
  setSetting(SETTING.lastParseAlertAt, String(Date.now()));

  const text =
    `⚠️ Не удалось разобрать страницу pass.rw.by (${query.from} → ${query.to}, ${query.date}).\n` +
    "Возможно, вёрстка сайта изменилась. Проверки продолжаются, но уведомления могут не приходить.";
  await sendOwnerMessage(text).catch((error) => log.error("Failed to send parse alert", String(error)));
}

async function checkGroup(key: string, group: Tracker[]) {
  const query: RouteQuery = { from: group[0].fromName, to: group[0].toName, date: group[0].date };
  const ids = group.map((tracker) => tracker.id);
  const startedAt = new Date();

  db.update(trackers).set({ forceCheckAt: null }).where(inArray(trackers.id, ids)).run();

  let trains: TrainInfo[];
  try {
    trains = parseRoute(await fetchRouteHtml(query));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = error instanceof RateLimitedError ? "rate_limited" : error instanceof BrokenPageError ? "parse_error" : "fetch_error";

    if (error instanceof RateLimitedError) pausedRoutes.set(key, Date.now() + RATE_LIMIT_PAUSE_MS);
    db.update(trackers).set({ lastAttemptAt: startedAt, lastError: message }).where(inArray(trackers.id, ids)).run();
    recordRun(key, startedAt, status, null, message);
    log.error(`Check of ${key} failed (${status})`, message);

    if (error instanceof BrokenPageError) await alertBrokenPage(query);
    return;
  }

  for (const tracker of group) {
    try {
      await checkTracker(tracker, trains, new Date());
    } catch (error) {
      log.error(`Tracker #${tracker.id} check failed`, String(error));
      db.update(trackers).set({ lastError: String(error) }).where(eq(trackers.id, tracker.id)).run();
    }
  }
  recordRun(key, startedAt, "ok", trains.length);
}

export async function runTick(now = new Date()) {
  db.update(trackers)
    .set({ active: false })
    .where(and(eq(trackers.active, true), lt(trackers.date, dateInMinsk(now))))
    .run();

  const dueTrackers = db
    .select()
    .from(trackers)
    .where(eq(trackers.active, true))
    .all()
    .filter((tracker) => isDue(tracker, now));

  // Trackers on the same route and date share one request.
  const groups = new Map<string, Tracker[]>();
  for (const tracker of dueTrackers) {
    const key = routeKey({ from: tracker.fromName, to: tracker.toName, date: tracker.date });
    groups.set(key, [...(groups.get(key) ?? []), tracker]);
  }

  let first = true;
  for (const [key, group] of groups) {
    if (Date.now() < (pausedRoutes.get(key) ?? 0)) continue;
    if (!first) await sleep(Math.random() * MAX_JITTER_MS);
    first = false;
    await checkGroup(key, group);
  }
}
