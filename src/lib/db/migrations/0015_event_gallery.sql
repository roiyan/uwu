CREATE TABLE IF NOT EXISTS "event_gallery" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "image_url" text NOT NULL,
  "caption" text,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_event_gallery_event"
  ON "event_gallery"("event_id");
