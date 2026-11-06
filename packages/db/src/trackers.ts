import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "./client";
import { checkRuns, events, routeSearches, seatState, trackers, workerLease } from "./schema";

export type NewTracker = Omit<typeof trackers.$inferInsert, "id" | "createdAt">;

export async function createTrackers(inputs: NewTracker[]) {
  const now = new Date();
  return db
    .insert(trackers)
    .values(inputs.map((input) => ({ ...input, createdAt: now })))
    .returning();
}

export async function listTrackers() {
  return db.select().from(trackers).orderBy(desc(trackers.createdAt));
}

export async function getTracker(id: number) {
  const rows = await db.select().from(trackers).where(eq(trackers.id, id));
  return rows[0] ?? null;
}

export async function listSeatStates(trackerIds?: number[]) {
  const query = db.select().from(seatState);
  return trackerIds ? query.where(inArray(seatState.trackerId, trackerIds)) : query;
}

export async function listEvents(trackerId: number, limit = 50) {
  return db
    .select()
    .from(events)
    .where(eq(events.trackerId, trackerId))
    .orderBy(desc(events.at))
    .limit(limit);
}

export async function listRecentCheckRuns(limit = 20) {
  return db.select().from(checkRuns).orderBy(desc(checkRuns.startedAt)).limit(limit);
}

export async function setTrackerActive(id: number, active: boolean) {
  await db.update(trackers).set({ active }).where(eq(trackers.id, id));
}

export async function deleteTracker(id: number) {
  await db.delete(trackers).where(eq(trackers.id, id));
}

/** Asks the worker to check these trackers on its next tick, regardless of their interval. */
export async function requestCheck(ids: number[]) {
  if (ids.length === 0) return;
  await db
    .update(trackers)
    .set({ forceCheckAt: new Date() })
    .where(and(inArray(trackers.id, ids), eq(trackers.active, true)));
}

export async function createRouteSearch(fromName: string, toName: string, date: string) {
  const rows = await db
    .insert(routeSearches)
    .values({ fromName, toName, date, createdAt: new Date() })
    .returning();
  return rows[0].id;
}

export async function getRouteSearch(id: number) {
  const rows = await db.select().from(routeSearches).where(eq(routeSearches.id, id));
  return rows[0] ?? null;
}

export async function getWorkerStatus() {
  const rows = await db
    .select()
    .from(workerLease)
    .orderBy(desc(workerLease.expiresAt))
    .limit(1);
  const lease = rows[0];
  if (!lease) return null;
  return { holder: lease.holder, expiresAt: lease.expiresAt };
}
