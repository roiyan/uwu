CREATE TYPE "public"."invite_status" AS ENUM('pending', 'accepted', 'revoked', 'expired', 'expired_manual');--> statement-breakpoint
CREATE TYPE "public"."owner_role" AS ENUM('bride', 'groom', 'both');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"user_email" text NOT NULL,
	"user_name" text,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"summary" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_members" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "event_members" ALTER COLUMN "role" SET DEFAULT 'editor';--> statement-breakpoint
ALTER TABLE "event_members" ADD COLUMN "invited_email" text;--> statement-breakpoint
ALTER TABLE "event_members" ADD COLUMN "invited_name" text;--> statement-breakpoint
ALTER TABLE "event_members" ADD COLUMN "invite_token" text;--> statement-breakpoint
ALTER TABLE "event_members" ADD COLUMN "invite_status" "invite_status" DEFAULT 'accepted' NOT NULL;--> statement-breakpoint
ALTER TABLE "event_members" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event_members" ADD COLUMN "accepted_email" text;--> statement-breakpoint
ALTER TABLE "event_members" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event_members" ADD COLUMN "invited_by" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "owner_role" "owner_role" DEFAULT 'bride' NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_members" ADD CONSTRAINT "event_members_invited_by_profiles_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_members" ADD CONSTRAINT "event_members_invite_token_unique" UNIQUE("invite_token");--> statement-breakpoint
ALTER TABLE "event_members" ADD CONSTRAINT "event_members_event_id_invited_email_unique" UNIQUE("event_id","invited_email");