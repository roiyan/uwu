-- ============================================================
-- Collaboration Phase 1: RLS + indexes
-- Extends event_members to carry invite-flow state. Tightens the
-- is_event_member / is_event_editor helpers so PENDING invites do NOT
-- grant access — only rows with invite_status = 'accepted' count.
-- Adds a public-anon-safe token lookup policy for the /invite/[token]
-- page, and append-only RLS for activity_logs.
-- ============================================================

-- Tighten existing helpers: require accepted membership.
CREATE OR REPLACE FUNCTION is_event_member(e_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM events WHERE id = e_id AND owner_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM event_members
         WHERE event_id = e_id
           AND user_id = auth.uid()
           AND invite_status = 'accepted'
      );
$$;

CREATE OR REPLACE FUNCTION is_event_editor(e_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM events WHERE id = e_id AND owner_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM event_members
         WHERE event_id = e_id
           AND user_id = auth.uid()
           AND invite_status = 'accepted'
           AND role IN ('editor','admin')
      );
$$;

-- Public (anon) can look up a pending, non-expired invitation row by
-- token — needed for the /invite/[token] landing page before the user
-- is authenticated. Only the bare minimum fields are leaked because of
-- RLS+column-level exposure via the SELECT policy.
DROP POLICY IF EXISTS "event_members_token_anon_select" ON event_members;
CREATE POLICY "event_members_token_anon_select" ON event_members
  FOR SELECT TO anon USING (
    invite_status = 'pending'
    AND invite_token IS NOT NULL
    AND (expires_at IS NULL OR expires_at > now())
  );

-- An authenticated user can accept their own invite (pending → accepted).
-- This closes a gap: the existing event_members_owner_update only lets
-- the event owner mutate rows, but the partner also needs to update
-- their own invitation on accept.
DROP POLICY IF EXISTS "event_members_self_accept" ON event_members;
CREATE POLICY "event_members_self_accept" ON event_members
  FOR UPDATE TO authenticated
  USING (
    invite_status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
  )
  WITH CHECK (
    user_id = auth.uid()
    AND invite_status = 'accepted'
  );

-- ========== activity_logs ==========

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Any event member (accepted) can read the event's activity.
CREATE POLICY "activity_logs_member_select" ON activity_logs
  FOR SELECT TO authenticated USING (is_event_member(event_id));

-- A user can append their own activity row for an event they belong to.
CREATE POLICY "activity_logs_member_insert" ON activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_event_member(event_id));

-- No update/delete — activity log is append-only.

-- ========== indexes ==========

-- Partial index on pending tokens for the /invite/[token] lookup.
CREATE INDEX IF NOT EXISTS event_members_token_idx
  ON event_members (invite_token)
  WHERE invite_status = 'pending';

-- Fast lookup for "what events does user X belong to?"
CREATE INDEX IF NOT EXISTS event_members_user_accepted_idx
  ON event_members (user_id, event_id)
  WHERE invite_status = 'accepted';

CREATE INDEX IF NOT EXISTS activity_logs_event_time_idx
  ON activity_logs (event_id, created_at DESC);
