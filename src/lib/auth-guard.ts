import { cache } from "react";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export type MemberRole = "viewer" | "editor" | "admin";
export type EffectiveRole = MemberRole | "owner";

// Page-level auth: revalidates the JWT with Supabase Auth (slow but fresh).
// cache() dedupes across layout + page within a single render.
export const getAuthedUser = cache(async function getAuthedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export async function requireAuthedUser() {
  const user = await getAuthedUser();
  if (!user) throw new Error("Tidak ter-autentikasi");
  return user;
}

// Fast session path for Server Actions — reads the signed cookie locally
// (middleware already refreshed the JWT on this request), skipping the
// ~200-400ms network call to Supabase Auth. Returns null for anonymous.
export async function getSessionUserFast() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

export async function requireSessionUserFast() {
  const user = await getSessionUserFast();
  if (!user) throw new Error("Tidak ter-autentikasi");
  return user;
}

// Emit a timing log whenever a Server Action takes longer than `slowMs`
// (and always in dev). Use inside actions that don't go through withAuth.
export async function timed<T>(
  label: string,
  fn: () => Promise<T>,
  slowMs = 500,
): Promise<T> {
  const t = Date.now();
  try {
    const result = await fn();
    const took = Date.now() - t;
    if (process.env.NODE_ENV !== "production" || took > slowMs) {
      console.log(`[action ${label}] ok ${took}ms`);
    }
    return result;
  } catch (err) {
    const took = Date.now() - t;
    console.error(`[action ${label}] err ${took}ms`, err);
    throw err;
  }
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
