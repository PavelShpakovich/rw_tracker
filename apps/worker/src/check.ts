import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@rw/db/client";
import { events, seatState, trackers } from "@rw/db/schema";
import { confirmSoldOut, diffSeats } from "./diff";
import type { SeatType } from "@rw/core/domain";
import { log } from "./log";
import { formatTrackerMessage } from "./notify/format";
import { broadcast } from "@rw/core/telegram";
import { listRecipientIds } from "@rw/db/recipients";
import type { TrainInfo } from "@rw/core/rw-types";

export type Tracker = typeof trackers.$inferSelect;

interface Observation {
  count: number;
  priceByn: number | null;
}

/** Sums seat counts of the tracked train across all matching rows. Null if the train is not listed. */
export function observeTracker(tracker: Tracker, trains: TrainInfo[]): Map<SeatType, Observation> | null {
  const matching = trains.filter((train) => train.number === tracker.trainNumber);
  if (matching.length === 0) return null;

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

async function applyObservation(tracker: Tracker, observed: Map<SeatType, Observation>, now: Date) {
  const stateRows = await db.select().from(seatState).where(eq(seatState.trackerId, tracker.id));

  const previous = new Map(stateRows.map((row) => [row.seatType, row.count]));
  const current = new Map([...observed].map(([seatType, { count }]) => [seatType, count]));
  const persistedPendingSoldOut = new Set(
    stateRows.filter((row) => row.pendingSoldOut).map((row) => row.seatType),
  );

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

  const { emit, deferred } = confirmSoldOut(changes, persistedPendingSoldOut);

  await db.transaction(async (tx) => {
    for (const [seatType, { count, priceByn }] of observed) {
      const isPendingSoldOut = deferred.has(seatType);
      if (isPendingSoldOut) continue;
      await tx
        .insert(seatState)
        .values({ trackerId: tracker.id, seatType, count, priceByn, updatedAt: now, pendingSoldOut: false })
        .onConflictDoUpdate({
          target: [seatState.trackerId, seatState.seatType],
          set: { count, priceByn, updatedAt: now, pendingSoldOut: false },
        });
    }

    // Update pendingSoldOut flag for deferred types
    for (const seatType of deferred) {
      await tx
        .insert(seatState)
        .values({
          trackerId: tracker.id,
          seatType,
          count: observed.get(seatType)?.count ?? 0,
          priceByn: observed.get(seatType)?.priceByn ?? null,
          updatedAt: now,
          pendingSoldOut: true,
        })
        .onConflictDoUpdate({
          target: [seatState.trackerId, seatState.seatType],
          set: { pendingSoldOut: true, updatedAt: now },
        });
    }

    for (const event of emit) {
      await tx.insert(events).values({
        trackerId: tracker.id,
        at: now,
        kind: event.kind,
        seatType: event.seatType,
        prev: event.prev,
        curr: event.curr,
        priceByn: observed.get(event.seatType)?.priceByn ?? null,
      });
    }

    await tx
      .update(trackers)
      .set({ lastAttemptAt: now, lastSuccessAt: now, lastError: null })
      .where(eq(trackers.id, tracker.id));
  });
}

async function notifyPending(tracker: Tracker) {
  const unsent = await db
    .select()
    .from(events)
    .where(and(eq(events.trackerId, tracker.id), isNull(events.notifiedAt)))
    .orderBy(asc(events.at));
  if (unsent.length === 0) return;

  const recipientIds = await listRecipientIds();
  if (recipientIds.length === 0) {
    log.warn(`Tracker #${tracker.id} has ${unsent.length} unsent event(s): no Telegram recipients configured`);
    return;
  }

  const result = await broadcast(recipientIds, formatTrackerMessage(tracker, unsent));
  for (const failure of result.failed) log.error(`Failed to notify chat ${failure.chatId}`, failure.error);
  if (result.sent.length === 0) throw new Error("Не доставлено ни одному получателю");

  await db
    .update(events)
    .set({ notifiedAt: new Date() })
    .where(inArray(events.id, unsent.map((event) => event.id)));
}

export async function checkTracker(tracker: Tracker, trains: TrainInfo[], now: Date) {
  const observed = observeTracker(tracker, trains);
  if (!observed) {
    await db
      .update(trackers)
      .set({ lastAttemptAt: now, lastError: "Поезд не найден в выдаче pass.rw.by" })
      .where(eq(trackers.id, tracker.id));
    return;
  }

  await applyObservation(tracker, observed, now);
  await notifyPending(tracker);
}
