ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "operator_pin" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "operator_token" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "operator_token_created_at" timestamp with time zone;
