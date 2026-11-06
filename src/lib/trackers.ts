import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { checkRuns, events, seatState, trackers } from "./db/schema";
import { EVENT_KINDS, SEAT_TYPES } from "./domain";
import { env } from "./env";

export const trackerInputSchema = z.object({
  fromName: z.string().trim().min(1),
  toName: z.string().trim().min(1),
  date: z.iso.date(),
  trainNumber: z.string().trim().min(1),
  trainTitle: z.string().trim().min(1),
  departure: z.string().nullable(),
  arrival: z.string().nullable(),
  seatTypes: z.array(z.enum(SEAT_TYPES)).min(1),
  minSeats: z.number().int().min(1).default(1),
  notifyOn: z.array(z.enum(EVENT_KINDS)).min(1),
  intervalSec: z.number().int().min(60).default(env.DEFAULT_INTERVAL_SEC),
});

export type TrackerInput = z.input<typeof trackerInputSchema>;
export type NewTracker = z.output<typeof trackerInputSchema>;

export function createTrackers(inputs: NewTracker[]) {
  const now = new Date();
  return db
    .insert(trackers)
    .values(inputs.map((input) => ({ ...input, createdAt: now })))
    .returning({ id: trackers.id })
    .all();
}

export function listTrackers() {
  return db.select().from(trackers).orderBy(desc(trackers.createdAt)).all();
}

export function getTracker(id: number) {
  return db.select().from(trackers).where(eq(trackers.id, id)).get() ?? null;
}

export function listSeatStates(trackerIds?: number[]) {
  const query = db.select().from(seatState);
  return trackerIds ? query.where(inArray(seatState.trackerId, trackerIds)).all() : query.all();
}

export function listEvents(trackerId: number, limit = 50) {
  return db
    .select()
    .from(events)
    .where(eq(events.trackerId, trackerId))
    .orderBy(desc(events.at))
    .limit(limit)
    .all();
}

export function listRecentCheckRuns(limit = 20) {
  return db.select().from(checkRuns).orderBy(desc(checkRuns.startedAt)).limit(limit).all();
}

export function setTrackerActive(id: number, active: boolean) {
  db.update(trackers).set({ active }).where(eq(trackers.id, id)).run();
}

export function deleteTracker(id: number) {
  db.delete(trackers).where(eq(trackers.id, id)).run();
}

/** Asks the worker to check these trackers on its next tick, regardless of their interval. */
export function requestCheck(ids: number[]) {
  if (ids.length === 0) return;
  db.update(trackers)
    .set({ forceCheckAt: new Date() })
    .where(and(inArray(trackers.id, ids), eq(trackers.active, true)))
    .run();
}
