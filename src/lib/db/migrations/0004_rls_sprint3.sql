-- ============================================================
-- RLS for Sprint 3 tables: messages, message_deliveries, orders
-- Messages & deliveries: event-member scoped.
-- Orders: per-user ownership. Webhook writes go through service role
-- so RLS is defense-in-depth only.
-- ============================================================

ALTER TABLE "messages"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "message_deliveries"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders"              ENABLE ROW LEVEL SECURITY;

-- messages
CREATE POLICY "messages_member_select" ON "messages"
  FOR SELECT TO authenticated USING (is_event_member(event_id));
CREATE POLICY "messages_editor_write" ON "messages"
  FOR ALL TO authenticated
  USING (is_event_editor(event_id)) WITH CHECK (is_event_editor(event_id));

-- message_deliveries (joined via messages.event_id)
CREATE POLICY "deliveries_member_select" ON "message_deliveries"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM "messages" m
      WHERE m.id = "message_deliveries".message_id
        AND is_event_member(m.event_id)
    )
  );
CREATE POLICY "deliveries_editor_write" ON "message_deliveries"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "messages" m
      WHERE m.id = "message_deliveries".message_id
        AND is_event_editor(m.event_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "messages" m
      WHERE m.id = "message_deliveries".message_id
        AND is_event_editor(m.event_id)
    )
  );

-- orders: owner-only (user_id = auth.uid()). Webhook server-role bypasses RLS.
CREATE POLICY "orders_owner_select" ON "orders"
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "orders_owner_insert" ON "orders"
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "orders_owner_update" ON "orders"
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
