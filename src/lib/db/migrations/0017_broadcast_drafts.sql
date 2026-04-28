CREATE TABLE IF NOT EXISTS "broadcast_drafts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "name" varchar(100) NOT NULL DEFAULT 'Draft',
  "channel" varchar(20) NOT NULL DEFAULT 'whatsapp',
  "wa_message" text,
  "email_subject" varchar(255),
  "email_body" text,
  "ai_tone" varchar(20),
  "ai_language" varchar(20),
  "ai_culture" varchar(20),
  "ai_length" varchar(20),
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_broadcast_drafts_event"
  ON "broadcast_drafts"("event_id");
