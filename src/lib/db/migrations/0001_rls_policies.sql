-- ============================================================
-- RLS policies for Phase 1 schema
-- Principle: deny-by-default. Authorize by event membership
-- (events.owner_id OR event_members.user_id = auth.uid()).
-- Invitation pages read via the anon role using the guest token.
-- ============================================================

ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages               ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE events                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE couples                ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_schedules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_theme_configs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_groups           ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests                 ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_event_member(e_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM events WHERE id = e_id AND owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM event_members WHERE event_id = e_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION is_event_editor(e_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM events WHERE id = e_id AND owner_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM event_members
         WHERE event_id = e_id AND user_id = auth.uid()
           AND role IN ('editor','admin')
      );
$$;

-- profiles
CREATE POLICY "profiles_self_select" ON profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_self_insert" ON profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- packages / themes (public read)
CREATE POLICY "packages_public_read" ON packages FOR SELECT USING (true);
CREATE POLICY "themes_public_read_active" ON themes FOR SELECT USING (is_active = true);

-- events
CREATE POLICY "events_member_select" ON events
  FOR SELECT TO authenticated USING (is_event_member(id));
CREATE POLICY "events_public_published" ON events
  FOR SELECT TO anon USING (is_published = true AND deleted_at IS NULL);
CREATE POLICY "events_owner_insert" ON events
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "events_editor_update" ON events
  FOR UPDATE TO authenticated USING (is_event_editor(id)) WITH CHECK (is_event_editor(id));
CREATE POLICY "events_owner_delete" ON events
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- event_members
CREATE POLICY "event_members_self_or_member_select" ON event_members
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_event_member(event_id));
CREATE POLICY "event_members_owner_insert" ON event_members
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE id = event_id AND owner_id = auth.uid())
  );
CREATE POLICY "event_members_owner_update" ON event_members
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM events WHERE id = event_id AND owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE id = event_id AND owner_id = auth.uid()));
CREATE POLICY "event_members_owner_delete" ON event_members
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM events WHERE id = event_id AND owner_id = auth.uid())
  );

-- couples
CREATE POLICY "couples_member_select" ON couples
  FOR SELECT TO authenticated USING (is_event_member(event_id));
CREATE POLICY "couples_public_select" ON couples
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM events
            WHERE events.id = couples.event_id
              AND events.is_published = true
              AND events.deleted_at IS NULL)
  );
CREATE POLICY "couples_editor_write" ON couples
  FOR ALL TO authenticated
  USING (is_event_editor(event_id)) WITH CHECK (is_event_editor(event_id));

-- event_schedules
CREATE POLICY "schedules_member_select" ON event_schedules
  FOR SELECT TO authenticated USING (is_event_member(event_id));
CREATE POLICY "schedules_public_select" ON event_schedules
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM events
            WHERE events.id = event_schedules.event_id
              AND events.is_published = true
              AND events.deleted_at IS NULL)
  );
CREATE POLICY "schedules_editor_write" ON event_schedules
  FOR ALL TO authenticated
  USING (is_event_editor(event_id)) WITH CHECK (is_event_editor(event_id));

-- event_theme_configs
CREATE POLICY "theme_configs_member_select" ON event_theme_configs
  FOR SELECT TO authenticated USING (is_event_member(event_id));
CREATE POLICY "theme_configs_public_select" ON event_theme_configs
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM events
            WHERE events.id = event_theme_configs.event_id
              AND events.is_published = true
              AND events.deleted_at IS NULL)
  );
CREATE POLICY "theme_configs_editor_write" ON event_theme_configs
  FOR ALL TO authenticated
  USING (is_event_editor(event_id)) WITH CHECK (is_event_editor(event_id));

-- guest_groups
CREATE POLICY "groups_member_select" ON guest_groups
  FOR SELECT TO authenticated USING (is_event_member(event_id));
CREATE POLICY "groups_editor_write" ON guest_groups
  FOR ALL TO authenticated
  USING (is_event_editor(event_id)) WITH CHECK (is_event_editor(event_id));

-- guests (couple-side only; guest-side reads go through service_role after
-- server-side token validation, so tokens are not enumerable via PostgREST).
CREATE POLICY "guests_member_select" ON guests
  FOR SELECT TO authenticated USING (is_event_member(event_id));
CREATE POLICY "guests_editor_write" ON guests
  FOR ALL TO authenticated
  USING (is_event_editor(event_id)) WITH CHECK (is_event_editor(event_id));

-- Profile auto-provisioning on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();
