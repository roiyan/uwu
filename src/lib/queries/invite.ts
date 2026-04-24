import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventMembers, events, profiles } from "@/lib/db/schema";

export type InviteLookupResult =
  | {
      state: "valid";
      collaboratorId: string;
      eventTitle: string;
      invitedEmail: string;
      invitedName: string | null;
      ownerDisplayName: string | null;
      expiresAt: string;
    }
  | { state: "used" }
  | { state: "expired" }
  | { state: "not_found" };

// Public (anon-safe) invite lookup. Lives in a plain module — NOT a
// "use server" file — so it is called as an in-process function by the
// server component, never routed through Next's Server Action pipeline.
// Drizzle uses the DATABASE_URL (postgres superuser) so RLS is bypassed;
// no Supabase auth cookie is read.
export async function resolveInviteToken(
  token: string,
): Promise<InviteLookupResult> {
  if (!token || token.length < 8) return { state: "not_found" };

  try {
    const rows = await db
      .select({
        id: eventMembers.id,
        eventId: eventMembers.eventId,
        invitedEmail: eventMembers.invitedEmail,
        invitedName: eventMembers.invitedName,
        inviteStatus: eventMembers.inviteStatus,
        expiresAt: eventMembers.expiresAt,
        eventTitle: events.title,
        ownerName: profiles.fullName,
      })
      .from(eventMembers)
      .leftJoin(events, eq(events.id, eventMembers.eventId))
      .leftJoin(profiles, eq(profiles.id, events.ownerId))
      .where(eq(eventMembers.inviteToken, token))
      .limit(1);

    const row = rows[0];
    if (!row) return { state: "not_found" };

    if (row.inviteStatus === "accepted") return { state: "used" };
    if (
      row.inviteStatus === "revoked" ||
      row.inviteStatus === "expired_manual"
    ) {
      return { state: "not_found" };
    }
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
      return { state: "expired" };
    }

    return {
      state: "valid",
      collaboratorId: row.id,
      eventTitle: row.eventTitle ?? "Undangan",
      invitedEmail: row.invitedEmail ?? "",
      invitedName: row.invitedName,
      ownerDisplayName: row.ownerName,
      expiresAt: row.expiresAt?.toISOString() ?? new Date().toISOString(),
    };
  } catch (err) {
    const e = err as { code?: string; message?: string; detail?: string };
    console.error("[resolveInviteToken] query failed", {
      code: e.code,
      message: e.message,
      detail: e.detail,
    });
    throw err;
  }
}
