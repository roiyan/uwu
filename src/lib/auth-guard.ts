import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, eventMembers } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export type MemberRole = "viewer" | "editor" | "admin";

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

async function resolveRole(
  eventId: string,
  userId: string,
): Promise<MemberRole | "owner" | null> {
  const [ev] = await db
    .select({ ownerId: events.ownerId })
    .from(events)
    .where(and(eq(events.id, eventId), isNull(events.deletedAt)))
    .limit(1);
  if (!ev) return null;
  if (ev.ownerId === userId) return "owner";
  const [m] = await db
    .select({ role: eventMembers.role })
    .from(eventMembers)
    .where(and(eq(eventMembers.eventId, eventId), eq(eventMembers.userId, userId)))
    .limit(1);
  return m?.role ?? null;
}

const ROLE_RANK: Record<MemberRole | "owner", number> = {
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
  const user = await getAuthedUser();
  if (!user) return { ok: false, error: "Silakan masuk terlebih dahulu." };

  const role = await resolveRole(eventId, user.id);
  if (!role) return { ok: false, error: "Anda tidak memiliki akses ke acara ini." };

  if (ROLE_RANK[role] < ROLE_RANK[required]) {
    return { ok: false, error: "Peran Anda tidak cukup untuk tindakan ini." };
  }

  try {
    const data = await action(user.id);
    return { ok: true, data };
  } catch (err) {
    console.error("[withAuth]", err);
    return { ok: false, error: "Terjadi kendala. Silakan coba lagi." };
  }
}

