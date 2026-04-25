import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, guestGroups, guests } from "@/lib/db/schema";
import type { GuestStatus } from "@/lib/db/queries/guests";

export type CheckedInGuestRow = {
  id: string;
  name: string;
  nickname: string | null;
  phone: string | null;
  rsvpStatus: GuestStatus;
  rsvpAttendees: number | null;
  checkedInAt: Date | null;
  checkedInBy: string | null;
  actualPax: number | null;
  checkinNotes: string | null;
  groupId: string | null;
  groupName: string | null;
  groupColor: string | null;
  token: string;
};

// Slim guest list used by the operator dashboard. Returns every live
// guest in the event so the search/scan modes can match locally without
// extra round-trips. Sorted with most-recent check-ins first so the
// "Baru Tiba" feed renders correctly when the client slices it.
export async function listGuestsForCheckin(
  eventId: string,
): Promise<CheckedInGuestRow[]> {
  return db
    .select({
      id: guests.id,
      name: guests.name,
      nickname: guests.nickname,
      phone: guests.phone,
      rsvpStatus: guests.rsvpStatus,
      rsvpAttendees: guests.rsvpAttendees,
      checkedInAt: guests.checkedInAt,
      checkedInBy: guests.checkedInBy,
      actualPax: guests.actualPax,
      checkinNotes: guests.checkinNotes,
      groupId: guests.groupId,
      groupName: guestGroups.name,
      groupColor: guestGroups.color,
      token: guests.token,
    })
    .from(guests)
    .leftJoin(guestGroups, eq(guestGroups.id, guests.groupId))
    .where(and(eq(guests.eventId, eventId), isNull(guests.deletedAt)))
    .orderBy(
      sql`${guests.checkedInAt} desc nulls last`,
      sql`${guests.name} asc`,
    );
}

export type CheckinStats = {
  totalGuests: number;
  totalRsvpHadir: number;
  checkedIn: number;
  walkIns: number;
  totalPax: number;
  belumTiba: number;
};

// Single round-trip aggregate for the live counter. `walkIns` are guests
// whose RSVP was missing/no when they checked in — distinguishing them
// gives the recap card the "Tamu Kejutan" line.
export async function getCheckinStats(eventId: string): Promise<CheckinStats> {
  const [row] = await db
    .select({
      totalGuests: sql<number>`count(*)::int`,
      totalRsvpHadir: sql<number>`count(*) filter (where ${guests.rsvpStatus} = 'hadir')::int`,
      checkedIn: sql<number>`count(*) filter (where ${guests.checkedInAt} is not null)::int`,
      walkIns: sql<number>`count(*) filter (where ${guests.checkedInAt} is not null and ${guests.rsvpStatus} <> 'hadir')::int`,
      totalPax: sql<number>`coalesce(sum(${guests.actualPax}) filter (where ${guests.checkedInAt} is not null), 0)::int`,
    })
    .from(guests)
    .where(and(eq(guests.eventId, eventId), isNull(guests.deletedAt)));

  const totalGuests = row?.totalGuests ?? 0;
  const checkedIn = row?.checkedIn ?? 0;
  return {
    totalGuests,
    totalRsvpHadir: row?.totalRsvpHadir ?? 0,
    checkedIn,
    walkIns: row?.walkIns ?? 0,
    totalPax: row?.totalPax ?? 0,
    belumTiba: Math.max(0, totalGuests - checkedIn),
  };
}

export type GroupCheckinBreakdown = {
  id: string;
  name: string;
  color: string | null;
  total: number;
  checkedIn: number;
};

// Per-group counts for the right rail. Includes empty groups (count 0)
// so the breakdown stays stable as guests are added.
export async function getGroupCheckinBreakdown(
  eventId: string,
): Promise<GroupCheckinBreakdown[]> {
  const rows = await db
    .select({
      id: guestGroups.id,
      name: guestGroups.name,
      color: guestGroups.color,
      total: sql<number>`count(${guests.id})::int`,
      checkedIn: sql<number>`count(${guests.id}) filter (where ${guests.checkedInAt} is not null)::int`,
    })
    .from(guestGroups)
    .leftJoin(
      guests,
      and(eq(guests.groupId, guestGroups.id), isNull(guests.deletedAt)),
    )
    .where(eq(guestGroups.eventId, eventId))
    .groupBy(guestGroups.id, guestGroups.name, guestGroups.color)
    .orderBy(
      sql`count(${guests.id}) filter (where ${guests.checkedInAt} is not null) desc`,
      guestGroups.name,
    );
  return rows;
}

export type RecentCheckinRow = {
  id: string;
  name: string;
  groupName: string | null;
  actualPax: number | null;
  checkedInAt: Date;
  rsvpStatus: GuestStatus;
};

// Latest 10 check-ins for the live feed. Polling clients re-query this
// every 5 seconds, so it has to stay light: no joins beyond group name,
// hard cap at 10 rows.
export async function listRecentCheckins(
  eventId: string,
  limit = 10,
): Promise<RecentCheckinRow[]> {
  const rows = await db
    .select({
      id: guests.id,
      name: guests.name,
      groupName: guestGroups.name,
      actualPax: guests.actualPax,
      checkedInAt: guests.checkedInAt,
      rsvpStatus: guests.rsvpStatus,
    })
    .from(guests)
    .leftJoin(guestGroups, eq(guestGroups.id, guests.groupId))
    .where(
      and(
        eq(guests.eventId, eventId),
        isNull(guests.deletedAt),
        sql`${guests.checkedInAt} is not null`,
      ),
    )
    .orderBy(desc(guests.checkedInAt))
    .limit(limit);

  // Narrow the type — the where clause already guarantees non-null.
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    groupName: r.groupName,
    actualPax: r.actualPax,
    checkedInAt: r.checkedInAt as Date,
    rsvpStatus: r.rsvpStatus,
  }));
}

// Public lookup used by both the operator dashboard (after QR scan) and
// the public /check-in/[eventId] station. Returns null when the token
// doesn't match a live guest in this specific event — guards against
// scanning a QR from a different couple's invitation.
export async function lookupGuestForCheckin(
  eventId: string,
  token: string,
): Promise<{
  id: string;
  name: string;
  nickname: string | null;
  groupName: string | null;
  rsvpStatus: GuestStatus;
  rsvpAttendees: number | null;
  checkedInAt: Date | null;
  actualPax: number | null;
} | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const [row] = await db
    .select({
      id: guests.id,
      name: guests.name,
      nickname: guests.nickname,
      groupName: guestGroups.name,
      rsvpStatus: guests.rsvpStatus,
      rsvpAttendees: guests.rsvpAttendees,
      checkedInAt: guests.checkedInAt,
      actualPax: guests.actualPax,
    })
    .from(guests)
    .leftJoin(guestGroups, eq(guestGroups.id, guests.groupId))
    .where(
      and(
        eq(guests.token, token),
        eq(guests.eventId, eventId),
        isNull(guests.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

// Verifies that an event exists, isn't deleted, and has check-in
// enabled. The public /check-in/[eventId] route uses this as its only
// gate — anyone with the eventId UUID can check guests in, by design,
// so the surface area is intentionally narrow.
export async function getCheckinEventGate(eventId: string): Promise<{
  id: string;
  title: string;
  slug: string;
  checkinEnabled: boolean;
} | null> {
  const [row] = await db
    .select({
      id: events.id,
      title: events.title,
      slug: events.slug,
      checkinEnabled: events.checkinEnabled,
    })
    .from(events)
    .where(and(eq(events.id, eventId), isNull(events.deletedAt)))
    .limit(1);
  return row ?? null;
}
