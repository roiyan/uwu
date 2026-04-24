"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventMembers, events } from "@/lib/db/schema";
import { requireSessionUserFast, type ActionResult } from "@/lib/auth-guard";
import { logActivity } from "@/lib/actions/activity";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function newToken() {
  return randomBytes(24).toString("base64url");
}

function sanitizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

// Ensure the caller owns the event (only owners can invite / manage
// collaborators in Phase 1). Returns the event row on success.
async function requireEventOwner(eventId: string, userId: string) {
  const [row] = await db
    .select({ id: events.id, ownerId: events.ownerId })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!row) throw new Error("Event tidak ditemukan");
  if (row.ownerId !== userId) {
    throw new Error("Hanya pemilik yang dapat mengelola kolaborator");
  }
  return row;
}

/**
 * Create (or replace) a pending partner invite for the given event + email.
 * One invite per (event, email) — existing pending rows are marked
 * 'expired_manual' before the new one lands.
 */
export async function createPartnerInvite(input: {
  eventId: string;
  partnerEmail: string;
  partnerName?: string;
}): Promise<
  ActionResult<{ inviteUrl: string; expiresAt: string; token: string }>
> {
  const user = await requireSessionUserFast();
  const email = sanitizeEmail(input.partnerEmail);
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return { ok: false, error: "Email pasangan tidak valid." };
  }

  try {
    await requireEventOwner(input.eventId, user.id);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  // Invalidate any existing pending invite for the same (event, email).
  await db
    .update(eventMembers)
    .set({ inviteStatus: "expired_manual", inviteToken: null })
    .where(
      and(
        eq(eventMembers.eventId, input.eventId),
        eq(eventMembers.invitedEmail, email),
        eq(eventMembers.inviteStatus, "pending"),
      ),
    );

  const token = newToken();
  const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);

  const [row] = await db
    .insert(eventMembers)
    .values({
      eventId: input.eventId,
      invitedEmail: email,
      invitedName: input.partnerName?.trim() || null,
      inviteToken: token,
      inviteStatus: "pending",
      expiresAt,
      invitedBy: user.id,
      role: "editor",
    })
    .onConflictDoUpdate({
      target: [eventMembers.eventId, eventMembers.invitedEmail],
      set: {
        invitedName: input.partnerName?.trim() || null,
        inviteToken: token,
        inviteStatus: "pending",
        expiresAt,
        userId: null,
        acceptedEmail: null,
        acceptedAt: null,
        revokedAt: null,
        invitedAt: new Date(),
        invitedBy: user.id,
      },
    })
    .returning({ id: eventMembers.id });

  void logActivity({
    eventId: input.eventId,
    action: "invite_partner",
    targetType: "collaborator",
    targetId: row.id,
    summary: `Mengundang ${email} sebagai pasangan`,
  });

  // No revalidatePath here — createPartnerInvite runs fire-and-forget from
  // the onboarding mempelai action, and revalidating mid-render throws
  // "used revalidatePath during render". Callers that need the settings
  // list to refresh (dashboard/settings/tabs.tsx) use router.refresh().

  return {
    ok: true,
    data: {
      inviteUrl: `${appUrl()}/invite/${token}`,
      expiresAt: expiresAt.toISOString(),
      token,
    },
  };
}

/**
 * Accept a pending invite. Caller must be authenticated. On success:
 *  - user_id + accepted_email set
 *  - invite_status → 'accepted'
 *  - invite_token cleared (one-time use)
 */
export async function acceptInvite(
  token: string,
): Promise<ActionResult<{ eventId: string }>> {
  const user = await requireSessionUserFast();

  const [row] = await db
    .select()
    .from(eventMembers)
    .where(eq(eventMembers.inviteToken, token))
    .limit(1);

  if (!row || row.inviteStatus !== "pending") {
    return {
      ok: false,
      error: "Link undangan tidak valid atau sudah digunakan.",
    };
  }
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    await db
      .update(eventMembers)
      .set({ inviteStatus: "expired", inviteToken: null })
      .where(eq(eventMembers.id, row.id));
    return {
      ok: false,
      error: "Link undangan sudah kedaluwarsa.",
    };
  }

  await db
    .update(eventMembers)
    .set({
      userId: user.id,
      acceptedEmail: user.email ?? null,
      inviteStatus: "accepted",
      acceptedAt: new Date(),
      inviteToken: null,
    })
    .where(eq(eventMembers.id, row.id));

  void logActivity({
    eventId: row.eventId,
    action: "accept_invite",
    targetType: "collaborator",
    targetId: row.id,
    summary: `Bergabung sebagai ${row.invitedName ?? "pasangan"}`,
  });

  revalidatePath("/dashboard", "layout");
  return { ok: true, data: { eventId: row.eventId } };
}

/**
 * Revoke a collaborator. Owner-only. Cannot revoke the owner's own record
 * (there isn't one — the owner is tracked via events.owner_id).
 */
export async function revokeCollaborator(
  collaboratorId: string,
): Promise<ActionResult> {
  const user = await requireSessionUserFast();

  const [row] = await db
    .select()
    .from(eventMembers)
    .where(eq(eventMembers.id, collaboratorId))
    .limit(1);
  if (!row) return { ok: false, error: "Kolaborator tidak ditemukan." };

  try {
    await requireEventOwner(row.eventId, user.id);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  await db
    .update(eventMembers)
    .set({
      inviteStatus: "revoked",
      revokedAt: new Date(),
      userId: null,
      inviteToken: null,
    })
    .where(eq(eventMembers.id, collaboratorId));

  void logActivity({
    eventId: row.eventId,
    action: "revoke_partner",
    targetType: "collaborator",
    targetId: collaboratorId,
    summary: `Menghapus akses ${row.invitedName ?? row.invitedEmail ?? "pasangan"}`,
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

/**
 * Regenerate an invite link — invalidates the old token, creates a new one,
 * bumps expiry 30 days. Used when the partner hasn't accepted yet.
 */
export async function regenerateInviteLink(
  collaboratorId: string,
): Promise<
  ActionResult<{ inviteUrl: string; expiresAt: string; token: string }>
> {
  const user = await requireSessionUserFast();

  const [row] = await db
    .select()
    .from(eventMembers)
    .where(eq(eventMembers.id, collaboratorId))
    .limit(1);
  if (!row) return { ok: false, error: "Kolaborator tidak ditemukan." };
  try {
    await requireEventOwner(row.eventId, user.id);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  const token = newToken();
  const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);

  await db
    .update(eventMembers)
    .set({
      inviteToken: token,
      inviteStatus: "pending",
      expiresAt,
      userId: null,
      acceptedEmail: null,
      acceptedAt: null,
      revokedAt: null,
      invitedAt: new Date(),
      invitedBy: user.id,
    })
    .where(eq(eventMembers.id, collaboratorId));

  void logActivity({
    eventId: row.eventId,
    action: "regenerate_link",
    targetType: "collaborator",
    targetId: collaboratorId,
    summary: `Membuat link undangan baru untuk ${row.invitedEmail}`,
  });

  revalidatePath("/dashboard/settings");

  return {
    ok: true,
    data: {
      inviteUrl: `${appUrl()}/invite/${token}`,
      expiresAt: expiresAt.toISOString(),
      token,
    },
  };
}

/**
 * Partner self-leave. Can only be called by the accepted user themselves.
 */
export async function leaveEvent(
  collaboratorId: string,
): Promise<ActionResult> {
  const user = await requireSessionUserFast();

  const [row] = await db
    .select()
    .from(eventMembers)
    .where(eq(eventMembers.id, collaboratorId))
    .limit(1);
  if (!row) return { ok: false, error: "Kolaborator tidak ditemukan." };
  if (row.userId !== user.id) {
    return { ok: false, error: "Anda tidak dapat keluar atas nama orang lain." };
  }

  await db
    .update(eventMembers)
    .set({
      inviteStatus: "revoked",
      revokedAt: new Date(),
      userId: null,
      inviteToken: null,
    })
    .where(eq(eventMembers.id, collaboratorId));

  void logActivity({
    eventId: row.eventId,
    action: "leave_event",
    targetType: "collaborator",
    targetId: collaboratorId,
    summary: "Keluar dari undangan",
  });

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

/**
 * Lightweight access check used by the dashboard layout to gate UI by role.
 * 'owner' if auth.uid() matches events.owner_id.
 * 'partner' if an accepted event_members row exists.
 */
export async function checkEventAccess(
  eventId: string,
  userId: string,
): Promise<{ hasAccess: boolean; role: "owner" | "partner" | null }> {
  const [row] = await db.execute<{ effective: "owner" | "partner" | null }>(sql`
    SELECT
      CASE
        WHEN e.owner_id = ${userId} THEN 'owner'
        WHEN em.user_id IS NOT NULL THEN 'partner'
        ELSE NULL
      END AS effective
    FROM events e
    LEFT JOIN event_members em
      ON em.event_id = e.id
     AND em.user_id = ${userId}
     AND em.invite_status = 'accepted'
    WHERE e.id = ${eventId}
      AND e.deleted_at IS NULL
    LIMIT 1
  `);
  const first = (
    row as unknown as { effective: "owner" | "partner" | null }[]
  )[0];
  const role = first?.effective ?? null;
  return { hasAccess: role !== null, role };
}

