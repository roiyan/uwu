import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export type MemberRole = "viewer" | "editor" | "admin";
export type EffectiveRole = MemberRole | "owner";

// Page-level auth: revalidates the JWT with Supabase Auth (slow but fresh).
export async function getAuthedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireAuthedUser() {
  const user = await getAuthedUser();
  if (!user) throw new Error("Tidak ter-autentikasi");
  return user;
}

// Action-level auth: middleware already refreshed the session on every
// request (src/middleware.ts -> updateSession). For Server Actions we trust
// the cookie to save a ~200-400ms round-trip to Supabase Auth.
async function getSessionUserFast() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

// One round-trip to resolve ownership + membership for a given event.
// Returns null if the event doesn't exist or the user has no relation to it.
async function resolveEffectiveRole(
  eventId: string,
  userId: string,
): Promise<EffectiveRole | null> {
  const rows = await db.execute<{ effective_role: EffectiveRole }>(sql`
    SELECT
      CASE
        WHEN e.owner_id = ${userId} THEN 'owner'::text
        ELSE em.role::text
      END AS effective_role
    FROM events e
    LEFT JOIN event_members em
      ON em.event_id = e.id
     AND em.user_id = ${userId}
    WHERE e.id = ${eventId}
      AND e.deleted_at IS NULL
    LIMIT 1
  `);
  const row = (rows as unknown as { effective_role: EffectiveRole | null }[])[0];
  if (!row) return null;
  return row.effective_role ?? null;
}

const ROLE_RANK: Record<EffectiveRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

export async function withAuth<T>(
  eventId: string,
  required: MemberRole,
  action: (userId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  const label = `[withAuth ${eventId.slice(0, 8)}]`;
  const started = Date.now();

  const user = await getSessionUserFast();
  const tAuth = Date.now() - started;
  if (!user) return { ok: false, error: "Silakan masuk terlebih dahulu." };

  const roleStart = Date.now();
  const role = await resolveEffectiveRole(eventId, user.id);
  const tRole = Date.now() - roleStart;

  if (!role) return { ok: false, error: "Anda tidak memiliki akses ke acara ini." };
  if (ROLE_RANK[role] < ROLE_RANK[required]) {
    return { ok: false, error: "Peran Anda tidak cukup untuk tindakan ini." };
  }

  try {
    const actStart = Date.now();
    const data = await action(user.id);
    const tAct = Date.now() - actStart;
    const total = Date.now() - started;
    if (process.env.NODE_ENV !== "production" || total > 500) {
      console.log(
        `${label} ok total=${total}ms auth=${tAuth}ms role=${tRole}ms action=${tAct}ms`,
      );
    }
    return { ok: true, data };
  } catch (err) {
    console.error(`${label} err`, err);
    return { ok: false, error: "Terjadi kendala. Silakan coba lagi." };
  }
}
