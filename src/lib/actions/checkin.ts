"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { events, guests } from "@/lib/db/schema";
import { withAuth, type ActionResult } from "@/lib/auth-guard";
import {
  getEventPackageLimit,
  type GuestStatus,
} from "@/lib/db/queries/guests";
import { lookupGuestForCheckin } from "@/lib/db/queries/checkin";

// ---------- Schemas ----------

const checkinPayloadSchema = z.object({
  // Operator-supplied count of bodies actually walking through the door.
  // Falls back to the RSVP'd count at the action layer when omitted.
  actualPax: z
    .number()
    .int()
    .min(1, "Minimal 1 orang")
    .max(20, "Terlalu banyak — periksa input")
    .optional(),
  // Free-text note ("hadiah dari Pak Hadi", "datang terlambat 30 menit").
  checkinNotes: z.string().max(280).optional(),
  // Operator name (defaults to logged-in user's full name on the
  // authenticated route; required on the public route since there's
  // no session to fall back to).
  checkedInBy: z.string().max(80).optional(),
});

const walkInPayloadSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(120),
  phone: z.string().max(40).optional(),
  groupId: z.string().uuid().nullable().optional(),
  actualPax: z
    .number()
    .int()
    .min(1, "Minimal 1 orang")
    .max(20, "Terlalu banyak — periksa input"),
  checkinNotes: z.string().max(280).optional(),
  checkedInBy: z.string().max(80).optional(),
});

export type CheckinPayload = z.infer<typeof checkinPayloadSchema>;
export type WalkInPayload = z.infer<typeof walkInPayloadSchema>;

export type CheckedInGuestSummary = {
  id: string;
  name: string;
  rsvpStatus: GuestStatus;
  rsvpAttendees: number | null;
  actualPax: number | null;
  checkedInAt: Date | null;
  checkedInBy: string | null;
};

// ---------- Gates ----------

/**
 * Verify the event exists, isn't soft-deleted, and has check-in
 * enabled. Throws on failure so callers can decide whether to surface
 * the error in the action result or let it bubble.
 *
 * On the authenticated dashboard this duplicates the toggle the
 * settings page enforces; on the public station it's the *only* gate
 * — anyone with the eventId UUID can hit those endpoints, so flipping
 * the toggle off must immediately deny new check-ins.
 */
async function assertCheckinEnabled(eventId: string): Promise<void> {
  const [row] = await db
    .select({ enabled: events.checkinEnabled })
    .from(events)
    .where(and(eq(events.id, eventId), isNull(events.deletedAt)))
    .limit(1);
  if (!row) throw new Error("Acara tidak ditemukan.");
  if (!row.enabled) {
    throw new Error("Check-in belum diaktifkan untuk acara ini.");
  }
}

/**
 * Walk-in adds a new guest, so it must respect the package's guest
 * cap. We count live (non-soft-deleted) guests and refuse the insert
 * once the limit is reached. Mirrors `assertBelowLimit` in
 * `src/lib/actions/guest.ts` so behaviour is consistent across the
 * Tamu page and the check-in station.
 */
async function assertWalkInBelowLimit(eventId: string): Promise<void> {
  const { limit } = await getEventPackageLimit(eventId);
  const [row] = await db
    .select({ total: count() })
    .from(guests)
    .where(and(eq(guests.eventId, eventId), isNull(guests.deletedAt)));
  if ((row?.total ?? 0) >= limit) {
    throw new Error(
      `Batas paket ${limit} tamu sudah tercapai. Walk-in baru tidak bisa dibuat — upgrade dulu di /harga.`,
    );
  }
}

// ---------- Internal core ops ----------
//
// The authenticated and public actions share their core mutations;
// only the gating differs. Keeping the SQL in one place makes it easy
// to keep the two surfaces in sync.

async function performCheckin(
  eventId: string,
  guestId: string,
  payload: CheckinPayload,
): Promise<CheckedInGuestSummary> {
  // We re-read the guest after the update so the caller can render
  // the post-checkin state (e.g. "Sudah tiba pukul 19:42") without a
  // separate round-trip.
  const fallbackPax =
    typeof payload.actualPax === "number" && payload.actualPax > 0
      ? payload.actualPax
      : 1;

  const updated = await db
    .update(guests)
    .set({
      checkedInAt: new Date(),
      checkedInBy: payload.checkedInBy ?? null,
      actualPax: fallbackPax,
      checkinNotes: payload.checkinNotes?.trim() || null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(guests.id, guestId),
        eq(guests.eventId, eventId),
        isNull(guests.deletedAt),
      ),
    )
    .returning({
      id: guests.id,
      name: guests.name,
      rsvpStatus: guests.rsvpStatus,
      rsvpAttendees: guests.rsvpAttendees,
      actualPax: guests.actualPax,
      checkedInAt: guests.checkedInAt,
      checkedInBy: guests.checkedInBy,
    });

  if (updated.length === 0) {
    throw new Error("Tamu tidak ditemukan atau sudah dihapus.");
  }
  return updated[0];
}

async function performWalkIn(
  eventId: string,
  payload: WalkInPayload,
): Promise<CheckedInGuestSummary> {
  // Walk-ins keep `rsvpStatus = 'baru'` so the analytics walk-in
  // counter in queries/checkin.ts (`status <> 'hadir' AND
  // checkedInAt is not null`) picks them up.
  const inserted = await db
    .insert(guests)
    .values({
      eventId,
      name: payload.name.trim(),
      phone: payload.phone?.trim() || null,
      groupId: payload.groupId ?? null,
      checkedInAt: new Date(),
      checkedInBy: payload.checkedInBy ?? null,
      actualPax: payload.actualPax,
      checkinNotes: payload.checkinNotes?.trim() || null,
    })
    .returning({
      id: guests.id,
      name: guests.name,
      rsvpStatus: guests.rsvpStatus,
      rsvpAttendees: guests.rsvpAttendees,
      actualPax: guests.actualPax,
      checkedInAt: guests.checkedInAt,
      checkedInBy: guests.checkedInBy,
    });
  return inserted[0];
}

async function performUndo(
  eventId: string,
  guestId: string,
): Promise<CheckedInGuestSummary> {
  const updated = await db
    .update(guests)
    .set({
      checkedInAt: null,
      checkedInBy: null,
      actualPax: null,
      checkinNotes: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(guests.id, guestId),
        eq(guests.eventId, eventId),
        isNull(guests.deletedAt),
      ),
    )
    .returning({
      id: guests.id,
      name: guests.name,
      rsvpStatus: guests.rsvpStatus,
      rsvpAttendees: guests.rsvpAttendees,
      actualPax: guests.actualPax,
      checkedInAt: guests.checkedInAt,
      checkedInBy: guests.checkedInBy,
    });

  if (updated.length === 0) {
    throw new Error("Tamu tidak ditemukan.");
  }
  return updated[0];
}

function bumpCachePaths(eventId: string) {
  // Both the dashboard operator station and the public station read
  // the same query results, so revalidate both surfaces. Public route
  // uses the eventId in the path, dashboard is a fixed pathname.
  revalidatePath("/dashboard/checkin");
  revalidatePath(`/check-in/${eventId}`);
}

// ---------- Authenticated actions (dashboard operator) ----------

/**
 * Mark an existing guest as arrived. Used by the operator dashboard
 * after QR scan or search-and-tap. The operator's profile name is
 * already known, so `payload.checkedInBy` is optional — caller passes
 * it for the audit trail.
 */
export async function checkinGuestAction(
  eventId: string,
  guestId: string,
  raw: unknown,
): Promise<ActionResult<CheckedInGuestSummary>> {
  const parsed = checkinPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  }
  return withAuth(eventId, "editor", async () => {
    await assertCheckinEnabled(eventId);
    const result = await performCheckin(eventId, guestId, parsed.data);
    bumpCachePaths(eventId);
    return result;
  });
}

/**
 * Insert + check in a brand new guest in one round-trip. The dashboard
 * exposes this when the operator searches for a name and gets no
 * matches — they can either correct the spelling or fall through to
 * walk-in.
 */
export async function checkinWalkInAction(
  eventId: string,
  raw: unknown,
): Promise<ActionResult<CheckedInGuestSummary>> {
  const parsed = walkInPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  }
  return withAuth(eventId, "editor", async () => {
    await assertCheckinEnabled(eventId);
    await assertWalkInBelowLimit(eventId);
    const result = await performWalkIn(eventId, parsed.data);
    bumpCachePaths(eventId);
    return result;
  });
}

/**
 * Undo a check-in (operator scanned the wrong guest, or a guest was
 * misidentified). Wipes the four checkin-* fields back to null but
 * leaves the guest row intact — the audit trail is the entry that
 * follows when the right guest is checked in.
 */
export async function undoCheckinAction(
  eventId: string,
  guestId: string,
): Promise<ActionResult<CheckedInGuestSummary>> {
  return withAuth(eventId, "editor", async () => {
    await assertCheckinEnabled(eventId);
    const result = await performUndo(eventId, guestId);
    bumpCachePaths(eventId);
    return result;
  });
}

// ---------- Public actions (operator station, no auth) ----------
//
// The public /check-in/[eventId] route accepts anyone who has the
// eventId UUID — by design, since the couple typically prints a QR
// for this URL and hands the device to a non-account-holder. The
// gate here is exactly two things: (1) the event has check-in on,
// (2) the guest token (or guest id) actually belongs to this event.
//
// Public actions return ActionResult so the client UI can keep the
// same code path for both surfaces.

export async function checkinGuestPublic(
  eventId: string,
  guestToken: string,
  raw: unknown,
): Promise<ActionResult<CheckedInGuestSummary>> {
  const parsed = checkinPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  }
  try {
    await assertCheckinEnabled(eventId);
    // Resolve token → guest id, scoped to this event so a stale QR
    // from another couple's invitation can't hit a row by accident.
    const guest = await lookupGuestForCheckin(eventId, guestToken);
    if (!guest) {
      return {
        ok: false,
        error: "QR ini bukan untuk acara ini, atau tamu sudah dihapus.",
      };
    }
    const result = await performCheckin(eventId, guest.id, parsed.data);
    bumpCachePaths(eventId);
    return { ok: true, data: result };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal check-in.",
    };
  }
}

export async function checkinWalkInPublic(
  eventId: string,
  raw: unknown,
): Promise<ActionResult<CheckedInGuestSummary>> {
  const parsed = walkInPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  }
  try {
    await assertCheckinEnabled(eventId);
    await assertWalkInBelowLimit(eventId);
    const result = await performWalkIn(eventId, parsed.data);
    bumpCachePaths(eventId);
    return { ok: true, data: result };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal mencatat walk-in.",
    };
  }
}

export async function undoCheckinPublic(
  eventId: string,
  guestId: string,
): Promise<ActionResult<CheckedInGuestSummary>> {
  try {
    await assertCheckinEnabled(eventId);
    const result = await performUndo(eventId, guestId);
    bumpCachePaths(eventId);
    return { ok: true, data: result };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal membatalkan.",
    };
  }
}
