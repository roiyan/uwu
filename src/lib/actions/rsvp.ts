"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { guests, guestGroups } from "@/lib/db/schema";
import type { ActionResult } from "@/lib/auth-guard";
import { rsvpInputSchema } from "@/lib/schemas/guest";

// Public action (no auth): validates by matching guests.token.
// Uses the server-side Drizzle client which goes through the postgres
// connection (service-role equivalent), so RLS is irrelevant here — the
// token IS the authorization proof.

export async function submitRsvpAction(
  prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult<{ status: "hadir" | "tidak_hadir"; attendees: number }>> {
  void prev;
  const attendeesRaw = formData.get("attendees");
  const parsed = rsvpInputSchema.safeParse({
    token: formData.get("token"),
    status: formData.get("status"),
    attendees: attendeesRaw ? Number(attendeesRaw) : 0,
    message: formData.get("message") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data RSVP tidak valid.",
    };
  }

  const { token, status, attendees, message } = parsed.data;
  const [guest] = await db
    .select({ id: guests.id, eventId: guests.eventId, slug: sql<string>`null` })
    .from(guests)
    .where(and(eq(guests.token, token), isNull(guests.deletedAt)))
    .limit(1);
  if (!guest) {
    return {
      ok: false,
      error: "Undangan tidak ditemukan. Mohon buka ulang tautan dari pesan Anda.",
    };
  }

  await db
    .update(guests)
    .set({
      rsvpStatus: status,
      rsvpAttendees: attendees,
      rsvpMessage: message || null,
      rsvpedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(guests.id, guest.id));

  // RSVP is a guest-facing write that doesn't change sidebar-visible
  // data — only counts on /guests and /analytics. Previously also
  // wiped the dashboard layout on every guest submission; now scoped
  // to the two aggregate pages and the Beranda summary.
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/guests");
  revalidatePath("/dashboard/analytics");

  return { ok: true, data: { status, attendees } };
}

export async function markOpenedAction(token: string) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return;
  await db
    .update(guests)
    .set({
      openedAt: sql`coalesce(${guests.openedAt}, now())`,
      rsvpStatus: sql`case when ${guests.rsvpStatus} in ('baru','diundang') then 'dibuka'::guest_rsvp_status else ${guests.rsvpStatus} end`,
    })
    .where(and(eq(guests.token, token), isNull(guests.deletedAt)));
}

export type ResolvedGuest = {
  name: string;
  rsvpStatus: "baru" | "diundang" | "dibuka" | "hadir" | "tidak_hadir";
  rsvpAttendees: number | null;
  rsvpMessage: string | null;
  // Surfaced so the public invitation can flip the floating QR button
  // into a "Kehadiran tercatat" badge once the operator has scanned at
  // the venue. Returned as ISO string for plain-JSON transit.
  checkedInAt: string | null;
  groupName: string | null;
};

export async function resolveGuestByTokenAction(
  eventId: string,
  token: string,
): Promise<ResolvedGuest | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const [row] = await db
    .select({
      name: guests.name,
      rsvpStatus: guests.rsvpStatus,
      rsvpAttendees: guests.rsvpAttendees,
      rsvpMessage: guests.rsvpMessage,
      checkedInAt: guests.checkedInAt,
      groupName: guestGroups.name,
    })
    .from(guests)
    .leftJoin(guestGroups, eq(guests.groupId, guestGroups.id))
    .where(
      and(
        eq(guests.token, token),
        eq(guests.eventId, eventId),
        isNull(guests.deletedAt),
      ),
    )
    .limit(1);
  if (!row) return null;
  return {
    name: row.name,
    rsvpStatus: row.rsvpStatus,
    rsvpAttendees: row.rsvpAttendees,
    rsvpMessage: row.rsvpMessage,
    checkedInAt: row.checkedInAt ? row.checkedInAt.toISOString() : null,
    groupName: row.groupName,
  };
}
