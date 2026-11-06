import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { EventKind, SeatType } from "../domain";

export const rw = pgSchema("rw");

export const trackers = rw.table("trackers", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  fromName: text("from_name").notNull(),
  toName: text("to_name").notNull(),
  date: text("date").notNull(),
  trainNumber: text("train_number").notNull(),
  trainTitle: text("train_title").notNull(),
  departure: text("departure"),
  arrival: text("arrival"),
  seatTypes: jsonb("seat_types").$type<SeatType[]>().notNull(),
  minSeats: integer("min_seats").notNull().default(1),
  notifyOn: jsonb("notify_on").$type<EventKind[]>().notNull(),
  intervalSec: integer("interval_sec").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true, mode: "date" }),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true, mode: "date" }),
  lastError: text("last_error"),
  forceCheckAt: timestamp("force_check_at", { withTimezone: true, mode: "date" }),
});

export const seatState = rw.table(
  "seat_state",
  {
    trackerId: integer("tracker_id")
      .notNull()
      .references(() => trackers.id, { onDelete: "cascade" }),
    seatType: text("seat_type").$type<SeatType>().notNull(),
    count: integer("count").notNull(),
    priceByn: doublePrecision("price_byn"),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
    pendingSoldOut: boolean("pending_sold_out").notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.trackerId, table.seatType] })],
);

export const events = rw.table(
  "events",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    trackerId: integer("tracker_id")
      .notNull()
      .references(() => trackers.id, { onDelete: "cascade" }),
    at: timestamp("at", { withTimezone: true, mode: "date" }).notNull(),
    kind: text("kind").$type<EventKind>().notNull(),
    seatType: text("seat_type").$type<SeatType>().notNull(),
    prev: integer("prev"),
    curr: integer("curr").notNull(),
    priceByn: doublePrecision("price_byn"),
    notifiedAt: timestamp("notified_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [index("events_tracker_idx").on(table.trackerId, table.notifiedAt)],
);

export const checkRuns = rw.table("check_runs", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  routeKey: text("route_key").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull(),
  durationMs: integer("duration_ms").notNull(),
  status: text("status").notNull(),
  trainsFound: integer("trains_found"),
  error: text("error"),
});

export const settings = rw.table("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const workerLease = rw.table("worker_lease", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  holder: text("holder").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const routeSearches = rw.table("route_searches", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  fromName: text("from_name").notNull(),
  toName: text("to_name").notNull(),
  date: text("date").notNull(),
  status: text("status").$type<"pending" | "done" | "error">().notNull().default("pending"),
  result: jsonb("result"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
});
