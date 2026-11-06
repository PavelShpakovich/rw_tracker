CREATE TABLE `check_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`route_key` text NOT NULL,
	`started_at` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	`status` text NOT NULL,
	`trains_found` integer,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tracker_id` integer NOT NULL,
	`at` integer NOT NULL,
	`kind` text NOT NULL,
	`seat_type` text NOT NULL,
	`prev` integer,
	`curr` integer NOT NULL,
	`price_byn` real,
	`notified_at` integer,
	FOREIGN KEY (`tracker_id`) REFERENCES `trackers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `events_tracker_idx` ON `events` (`tracker_id`,`notified_at`);--> statement-breakpoint
CREATE TABLE `seat_state` (
	`tracker_id` integer NOT NULL,
	`seat_type` text NOT NULL,
	`count` integer NOT NULL,
	`price_byn` real,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`tracker_id`, `seat_type`),
	FOREIGN KEY (`tracker_id`) REFERENCES `trackers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trackers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_name` text NOT NULL,
	`to_name` text NOT NULL,
	`date` text NOT NULL,
	`train_number` text NOT NULL,
	`train_title` text NOT NULL,
	`departure` text,
	`arrival` text,
	`seat_types` text NOT NULL,
	`min_seats` integer DEFAULT 1 NOT NULL,
	`notify_on` text NOT NULL,
	`interval_sec` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`last_attempt_at` integer,
	`last_success_at` integer,
	`last_error` text,
	`force_check_at` integer
);
