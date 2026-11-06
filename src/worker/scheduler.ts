import { and, eq, inArray, lt, sql } from "drizzle-orm";
import os from "node:os";
import { db } from "../lib/db";
import { checkRuns, routeSearches, trackers, workerLease } from "../lib/db/schema";
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
const LEASE_TTL_SEC = 90;

const holderId = `${os.hostname()}:${process.pid}`;

// Route key -> timestamp until which requests for it are suspended.
const pausedRoutes = new Map<string, number>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const routeKey = ({ from, to, date }: RouteQuery) => `${from}|${to}|${date}`;

function isDue(tracker: Tracker, now: Date): boolean {
  if (tracker.forceCheckAt) return true;
  if (!tracker.lastAttemptAt) return true;
  return now.getTime() - tracker.lastAttemptAt.getTime() >= tracker.intervalSec * 1000;
}

async function recordRun(key: string, startedAt: Date, status: string, trainsFound: number | null, error?: string) {
  await db.insert(checkRuns).values({
    routeKey: key,
    startedAt,
    durationMs: Date.now() - startedAt.getTime(),
    status,
    trainsFound: trainsFound ?? null,
    error: error ?? null,
  });
}

async function alertBrokenPage(query: RouteQuery) {
  const lastAlert = Number((await getSetting(SETTING.lastParseAlertAt)) ?? 0);
  if (Date.now() - lastAlert < PARSE_ALERT_COOLDOWN_MS) return;
  await setSetting(SETTING.lastParseAlertAt, String(Date.now()));

  const text =
    `⚠️ Не удалось разобрать страницу pass.rw.by (${query.from} → ${query.to}, ${query.date}).\n` +
    "Возможно, вёрстка сайта изменилась. Проверки продолжаются, но уведомления могут не приходить.";
  await sendOwnerMessage(text).catch((error) => log.error("Failed to send parse alert", String(error)));
}

async function checkGroup(key: string, group: Tracker[]) {
  const query: RouteQuery = { from: group[0].fromName, to: group[0].toName, date: group[0].date };
  const ids = group.map((tracker) => tracker.id);
  const startedAt = new Date();

  await db.update(trackers).set({ forceCheckAt: null }).where(inArray(trackers.id, ids));

  let trains: TrainInfo[];
  try {
    trains = parseRoute(await fetchRouteHtml(query));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status =
      error instanceof RateLimitedError
        ? "rate_limited"
        : error instanceof BrokenPageError
          ? "parse_error"
          : "fetch_error";

    if (error instanceof RateLimitedError) pausedRoutes.set(key, Date.now() + RATE_LIMIT_PAUSE_MS);
    await db.update(trackers).set({ lastAttemptAt: startedAt, lastError: message }).where(inArray(trackers.id, ids));
    await recordRun(key, startedAt, status, null, message);
    log.error(`Check of ${key} failed (${status})`, message);

    if (error instanceof BrokenPageError) await alertBrokenPage(query);
    return;
  }

  for (const tracker of group) {
    try {
      await checkTracker(tracker, trains, new Date());
    } catch (error) {
      log.error(`Tracker #${tracker.id} check failed`, String(error));
      await db.update(trackers).set({ lastError: String(error) }).where(eq(trackers.id, tracker.id));
    }
  }
  await recordRun(key, startedAt, "ok", trains.length);
}

/** Returns true if this worker holds the lease. */
export async function acquireLease(): Promise<boolean> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LEASE_TTL_SEC * 1000);

  // Try to claim the row: either we already hold it, or the existing lease has expired
  const existing = await db.select().from(workerLease).limit(1);
  if (existing.length === 0) {
    try {
      await db.insert(workerLease).values({ holder: holderId, expiresAt });
      return true;
    } catch {
      return false;
    }
  }

  const lease = existing[0];
  const weHoldIt = lease.holder === holderId;
  const isExpired = lease.expiresAt <= now;

  if (!weHoldIt && !isExpired) {
    return false;
  }

  const result = await db
    .update(workerLease)
    .set({ holder: holderId, expiresAt })
    .where(
      and(
        eq(workerLease.id, lease.id),
        weHoldIt ? eq(workerLease.holder, holderId) : lt(workerLease.expiresAt, sql`now()`),
      ),
    )
    .returning();

  return result.length > 0;
}

export async function releaseLease() {
  await db
    .update(workerLease)
    .set({ expiresAt: new Date() })
    .where(eq(workerLease.holder, holderId));
}

export async function processRouteSearches() {
  const pending = await db
    .select()
    .from(routeSearches)
    .where(eq(routeSearches.status, "pending"));

  const now = Date.now();
  for (const search of pending) {
    try {
      const html = await fetchRouteHtml({ from: search.fromName, to: search.toName, date: search.date });
      const trains = parseRoute(html);
      await db
        .update(routeSearches)
        .set({ status: "done", result: trains as unknown as Record<string, unknown>[] })
        .where(eq(routeSearches.id, search.id));
    } catch (error) {
      await db
        .update(routeSearches)
        .set({ status: "error", error: error instanceof Error ? error.message : String(error) })
        .where(eq(routeSearches.id, search.id));
    }
  }

  // Clean up old searches (> 24h)
  await db
    .delete(routeSearches)
    .where(lt(routeSearches.createdAt, new Date(now - 24 * 60 * 60 * 1000)));
}

export async function runTick(now = new Date()) {
  await db
    .update(trackers)
    .set({ active: false })
    .where(and(eq(trackers.active, true), lt(trackers.date, dateInMinsk(now))));

  const allTrackers = await db.select().from(trackers).where(eq(trackers.active, true));
  const dueTrackers = allTrackers.filter((tracker) => isDue(tracker, now));

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
