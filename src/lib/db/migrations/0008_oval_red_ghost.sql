ALTER TABLE "guests" ADD COLUMN "nickname" text;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "plus_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "notes" text;