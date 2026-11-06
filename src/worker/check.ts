import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../lib/db";
import { events, seatState, trackers } from "../lib/db/schema";
import { confirmSoldOut, diffSeats } from "../lib/diff";
import type { SeatType } from "../lib/domain";
import { log } from "../lib/log";
import { formatTrackerMessage } from "../lib/notify/format";
import { getOwnerChatId, sendOwnerMessage } from "../lib/notify/telegram";
import type { TrainInfo } from "../lib/rw/types";

export type Tracker = typeof trackers.$inferSelect;

interface Observation {
  count: number;
  priceByn: number | null;
}

// "Sold out" readings waiting for confirmation, per tracker. In memory on purpose:
// after a restart the confirmation simply starts again.
const pendingSoldOut = new Map<number, Set<SeatType>>();

/** Sums seat counts of the tracked train across all matching rows. Null if the train is not listed. */
export function observeTracker(tracker: Tracker, trains: TrainInfo[]): Map<SeatType, Observation> | null {
  const matching = trains.filter((train) => train.number === tracker.trainNumber);
  if (matching.length === 0) return null;

  // A tracked seat type missing from the listing means zero seats, not "unknown".
  const observed = new Map<SeatType, Observation>();
  for (const seatType of tracker.seatTypes) observed.set(seatType, { count: 0, priceByn: null });

  for (const train of matching) {
    for (const seat of train.seats) {
      for (const key of [seat.seatType, "any"] as const) {
        const entry = observed.get(key);
        if (!entry) continue;
        entry.count += seat.count;
        entry.priceByn = lowestPrice(entry.priceByn, seat.priceByn);
      }
    }
  }
  return observed;
}

function lowestPrice(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
}

function applyObservation(tracker: Tracker, observed: Map<SeatType, Observation>, now: Date) {
  const previous = new Map(
    db
      .select()
      .from(seatState)
      .where(eq(seatState.trackerId, tracker.id))
      .all()
      .map((row) => [row.seatType, row.count]),
  );
  const current = new Map([...observed].map(([seatType, { count }]) => [seatType, count]));

  // The first successful check only records a baseline.
  const isBaseline = tracker.lastSuccessAt === null;
  const changes = isBaseline
    ? []
    : diffSeats({
        previous,
        current,
        seatTypes: tracker.seatTypes,
        minSeats: tracker.minSeats,
        notifyOn: tracker.notifyOn,
      });

  const { emit, deferred } = confirmSoldOut(changes, pendingSoldOut.get(tracker.id) ?? new Set());
  pendingSoldOut.set(tracker.id, deferred);

  db.transaction((tx) => {
    for (const [seatType, { count, priceByn }] of observed) {
      // Deferred types keep their old state so the next check still sees the transition.
      if (deferred.has(seatType)) continue;
      tx.insert(seatState)
        .values({ trackerId: tracker.id, seatType, count, priceByn, updatedAt: now })
        .onConflictDoUpdate({
          target: [seatState.trackerId, seatState.seatType],
          set: { count, priceByn, updatedAt: now },
        })
        .run();
    }

    for (const event of emit) {
      tx.insert(events)
        .values({
          trackerId: tracker.id,
          at: now,
          kind: event.kind,
          seatType: event.seatType,
          prev: event.prev,
          curr: event.curr,
          priceByn: observed.get(event.seatType)?.priceByn ?? null,
        })
        .run();
    }

    tx.update(trackers)
      .set({ lastAttemptAt: now, lastSuccessAt: now, lastError: null })
      .where(eq(trackers.id, tracker.id))
      .run();
  });
}

/** Sends every event of this tracker that has not been delivered yet, including ones left over from a failed send. */
async function notifyPending(tracker: Tracker) {
  const unsent = db
    .select()
    .from(events)
    .where(and(eq(events.trackerId, tracker.id), isNull(events.notifiedAt)))
    .orderBy(asc(events.at))
    .all();
  if (unsent.length === 0) return;

  if (getOwnerChatId() === null) {
    log.warn(`Tracker #${tracker.id} has ${unsent.length} unsent event(s): TELEGRAM_ALLOWED_USER_ID is not set`);
    return;
  }

  await sendOwnerMessage(formatTrackerMessage(tracker, unsent));
  db.update(events)
    .set({ notifiedAt: new Date() })
    .where(inArray(events.id, unsent.map((event) => event.id)))
    .run();
}

export async function checkTracker(tracker: Tracker, trains: TrainInfo[], now: Date) {
  const observed = observeTracker(tracker, trains);
  if (!observed) {
    db.update(trackers)
      .set({ lastAttemptAt: now, lastError: "Поезд не найден в выдаче pass.rw.by" })
      .where(eq(trackers.id, tracker.id))
      .run();
    return;
  }

  applyObservation(tracker, observed, now);
  await notifyPending(tracker);
}
