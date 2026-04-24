ALTER TABLE "guests" ADD COLUMN "send_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "last_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "last_sent_via" text;