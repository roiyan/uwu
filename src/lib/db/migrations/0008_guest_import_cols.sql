-- Add import-related columns to guests.
-- `nickname` — optional salutation for invitation greeting.
-- `plus_count` — invited capacity (1–10). Distinct from rsvp_attendees
--                which is the actual count reported at RSVP time.
-- `notes`    — owner-facing private annotation.

ALTER TABLE "guests"
  ADD COLUMN IF NOT EXISTS "nickname"   text,
  ADD COLUMN IF NOT EXISTS "plus_count" integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "notes"      text;
