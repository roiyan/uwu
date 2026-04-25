ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "checkin_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "checked_in_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "checked_in_by" text;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "actual_pax" integer;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "checkin_notes" text;
