CREATE TABLE "rw"."telegram_recipients" (
	"chat_id" bigint PRIMARY KEY NOT NULL,
	"label" text,
	"created_at" timestamp with time zone NOT NULL
);
