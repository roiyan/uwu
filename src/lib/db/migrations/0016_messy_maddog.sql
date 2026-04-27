-- Adds the centralised media library table behind the Website Editor's
-- "Perpustakaan Media" panel. Files live in the existing `event-media`
-- Supabase Storage bucket; this row carries the public URL + size/type
-- metadata so the editor grid can render and the storage quota can be
-- computed without round-tripping to Storage.
--
-- The auto-generated diff against `meta/_journal.json` also surfaces
-- DDL for tables/columns that production already has (event_gallery,
-- gift_accounts, gift_confirmations, events.timezone, events.operator_*).
-- Those are intentionally omitted here — they are tracked in the
-- snapshot for type generation only and need no SQL on prod.
CREATE TABLE IF NOT EXISTS "event_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"file_url" text NOT NULL,
	"storage_path" text NOT NULL,
	"file_name" text,
	"file_size" integer,
	"mime_type" text,
	"width" integer,
	"height" integer,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_media"
	ADD CONSTRAINT "event_media_event_id_events_id_fk"
	FOREIGN KEY ("event_id") REFERENCES "public"."events"("id")
	ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_event_media_event_id"
	ON "event_media" ("event_id");
