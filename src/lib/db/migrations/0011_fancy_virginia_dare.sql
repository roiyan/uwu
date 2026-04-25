ALTER TABLE "events" ADD COLUMN "checkin_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "checked_in_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "checked_in_by" text;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "actual_pax" integer;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "checkin_notes" text;