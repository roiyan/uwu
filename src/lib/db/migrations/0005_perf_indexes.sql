-- ============================================================
-- Performance indexes for hot query paths.
-- Only PK + UNIQUE constraints had indexes before; every
-- filter-by-event-id query was doing a seq scan.
-- CONCURRENTLY would be safer on live data but drizzle-kit wraps
-- migrations in a transaction. For the current data volumes this is
-- fine; revisit if we ever grow past ~50k rows per table.
-- ============================================================

CREATE INDEX IF NOT EXISTS "events_owner_id_idx"
  ON "events" ("owner_id") WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "event_members_user_id_idx"
  ON "event_members" ("user_id");

CREATE INDEX IF NOT EXISTS "event_schedules_event_id_idx"
  ON "event_schedules" ("event_id", "sort_order");

CREATE INDEX IF NOT EXISTS "guests_event_id_idx"
  ON "guests" ("event_id") WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "guests_group_id_idx"
  ON "guests" ("group_id") WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "guest_groups_event_id_idx"
  ON "guest_groups" ("event_id");

CREATE INDEX IF NOT EXISTS "messages_event_id_idx"
  ON "messages" ("event_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "message_deliveries_message_id_idx"
  ON "message_deliveries" ("message_id");

CREATE INDEX IF NOT EXISTS "orders_user_id_idx"
  ON "orders" ("user_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "orders_event_id_idx"
  ON "orders" ("event_id") WHERE "event_id" IS NOT NULL;
