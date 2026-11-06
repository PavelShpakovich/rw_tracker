CREATE SCHEMA "rw";
--> statement-breakpoint
CREATE TABLE "rw"."check_runs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rw"."check_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"route_key" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"duration_ms" integer NOT NULL,
	"status" text NOT NULL,
	"trains_found" integer,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "rw"."events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rw"."events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tracker_id" integer NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"kind" text NOT NULL,
	"seat_type" text NOT NULL,
	"prev" integer,
	"curr" integer NOT NULL,
	"price_byn" double precision,
	"notified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rw"."route_searches" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rw"."route_searches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"from_name" text NOT NULL,
	"to_name" text NOT NULL,
	"date" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"result" jsonb,
	"error" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rw"."seat_state" (
	"tracker_id" integer NOT NULL,
	"seat_type" text NOT NULL,
	"count" integer NOT NULL,
	"price_byn" double precision,
	"updated_at" timestamp with time zone NOT NULL,
	"pending_sold_out" boolean DEFAULT false NOT NULL,
	CONSTRAINT "seat_state_tracker_id_seat_type_pk" PRIMARY KEY("tracker_id","seat_type")
);
--> statement-breakpoint
CREATE TABLE "rw"."settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rw"."trackers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rw"."trackers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"from_name" text NOT NULL,
	"to_name" text NOT NULL,
	"date" text NOT NULL,
	"train_number" text NOT NULL,
	"train_title" text NOT NULL,
	"departure" text,
	"arrival" text,
	"seat_types" jsonb NOT NULL,
	"min_seats" integer DEFAULT 1 NOT NULL,
	"notify_on" jsonb NOT NULL,
	"interval_sec" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_error" text,
	"force_check_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rw"."worker_lease" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rw"."worker_lease_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"holder" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rw"."events" ADD CONSTRAINT "events_tracker_id_trackers_id_fk" FOREIGN KEY ("tracker_id") REFERENCES "rw"."trackers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rw"."seat_state" ADD CONSTRAINT "seat_state_tracker_id_trackers_id_fk" FOREIGN KEY ("tracker_id") REFERENCES "rw"."trackers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_tracker_idx" ON "rw"."events" USING btree ("tracker_id","notified_at");