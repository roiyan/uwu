ALTER TYPE "public"."message_status" ADD VALUE 'scheduled';--> statement-breakpoint
ALTER TYPE "public"."message_status" ADD VALUE 'cancelled';--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "scheduled_at" timestamp with time zone;