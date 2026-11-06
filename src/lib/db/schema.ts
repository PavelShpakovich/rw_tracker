import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { EventKind, SeatType } from "../domain";

export const trackers = sqliteTable("trackers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fromName: text("from_name").notNull(),
  toName: text("to_name").notNull(),
  date: text("date").notNull(),
  trainNumber: text("train_number").notNull(),
  trainTitle: text("train_title").notNull(),
  departure: text("departure"),
  arrival: text("arrival"),
  seatTypes: text("seat_types", { mode: "json" }).$type<SeatType[]>().notNull(),
  minSeats: integer("min_seats").notNull().default(1),
  notifyOn: text("notify_on", { mode: "json" }).$type<EventKind[]>().notNull(),
  intervalSec: integer("interval_sec").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  lastAttemptAt: integer("last_attempt_at", { mode: "timestamp_ms" }),
  lastSuccessAt: integer("last_success_at", { mode: "timestamp_ms" }),
  lastError: text("last_error"),
  forceCheckAt: integer("force_check_at", { mode: "timestamp_ms" }),
});

export const seatState = sqliteTable(
  "seat_state",
  {
    trackerId: integer("tracker_id")
      .notNull()
      .references(() => trackers.id, { onDelete: "cascade" }),
    seatType: text("seat_type").$type<SeatType>().notNull(),
    count: integer("count").notNull(),
    priceByn: real("price_byn"),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.trackerId, table.seatType] })],
);

export const events = sqliteTable(
  "events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    trackerId: integer("tracker_id")
      .notNull()
      .references(() => trackers.id, { onDelete: "cascade" }),
    at: integer("at", { mode: "timestamp_ms" }).notNull(),
    kind: text("kind").$type<EventKind>().notNull(),
    seatType: text("seat_type").$type<SeatType>().notNull(),
    prev: integer("prev"),
    curr: integer("curr").notNull(),
    priceByn: real("price_byn"),
    notifiedAt: integer("notified_at", { mode: "timestamp_ms" }),
  },
  (table) => [index("events_tracker_idx").on(table.trackerId, table.notifiedAt)],
);

export const checkRuns = sqliteTable("check_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  routeKey: text("route_key").notNull(),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  durationMs: integer("duration_ms").notNull(),
  status: text("status").notNull(),
  trainsFound: integer("trains_found"),
  error: text("error"),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
