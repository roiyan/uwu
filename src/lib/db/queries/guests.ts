import { and, asc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, guestGroups, guests, packages, themes } from "@/lib/db/schema";
import type { guestRsvpStatusEnum } from "@/lib/db/schema";

export type GuestStatus = (typeof guestRsvpStatusEnum.enumValues)[number];

export type GuestListFilter = {
  search?: string;
  groupId?: string | null;
  status?: GuestStatus | null;
};

export async function listGuestsForEvent(
  eventId: string,
  filter: GuestListFilter = {},
) {
  const conditions = [
    eq(guests.eventId, eventId),
    isNull(guests.deletedAt),
  ];
  if (filter.search) {
    const q = `%${filter.search}%`;
    conditions.push(
      or(ilike(guests.name, q), ilike(guests.phone, q), ilike(guests.email, q))!,
    );
  }
  if (filter.groupId) {
    conditions.push(eq(guests.groupId, filter.groupId));
  }
  if (filter.status) {
    conditions.push(eq(guests.rsvpStatus, filter.status));
  }

  return db
    .select({
      id: guests.id,
      name: guests.name,
      phone: guests.phone,
      email: guests.email,
      token: guests.token,
      rsvpStatus: guests.rsvpStatus,
      rsvpAttendees: guests.rsvpAttendees,
      rsvpMessage: guests.rsvpMessage,
      rsvpedAt: guests.rsvpedAt,
      openedAt: guests.openedAt,
      invitedAt: guests.invitedAt,
      createdAt: guests.createdAt,
      groupId: guests.groupId,
      groupName: guestGroups.name,
      groupColor: guestGroups.color,
    })
    .from(guests)
    .leftJoin(guestGroups, eq(guestGroups.id, guests.groupId))
    .where(and(...conditions))
    .orderBy(asc(guests.createdAt));
}

export async function listGuestGroups(eventId: string) {
  return db
    .select()
    .from(guestGroups)
    .where(eq(guestGroups.eventId, eventId))
    .orderBy(asc(guestGroups.sortOrder), asc(guestGroups.name));
}

export async function countGuestsByStatus(eventId: string) {
  const rows = await db
    .select({
      status: guests.rsvpStatus,
      count: sql<number>`count(*)::int`,
    })
    .from(guests)
    .where(and(eq(guests.eventId, eventId), isNull(guests.deletedAt)))
    .groupBy(guests.rsvpStatus);

  const total: Record<GuestStatus, number> = {
    baru: 0,
    diundang: 0,
    dibuka: 0,
    hadir: 0,
    tidak_hadir: 0,
  };
  for (const r of rows) total[r.status] = r.count;
  return total;
}

export async function sumAttendees(eventId: string) {
  const [row] = await db
    .select({
      confirmed: sql<number>`coalesce(sum(${guests.rsvpAttendees}) filter (where ${guests.rsvpStatus} = 'hadir'), 0)::int`,
    })
    .from(guests)
    .where(and(eq(guests.eventId, eventId), isNull(guests.deletedAt)));
  return row?.confirmed ?? 0;
}

export async function countLiveGuests(eventId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(guests)
    .where(and(eq(guests.eventId, eventId), isNull(guests.deletedAt)));
  return row?.count ?? 0;
}

export async function getEventPackageLimit(eventId: string) {
  const [row] = await db
    .select({ guestLimit: packages.guestLimit, packageName: packages.name })
    .from(events)
    .leftJoin(packages, eq(packages.id, events.packageId))
    .where(eq(events.id, eventId))
    .limit(1);
  return {
    limit: row?.guestLimit ?? 25,
    packageName: row?.packageName ?? "Starter",
  };
}

export async function getGuestByToken(token: string) {
  const [row] = await db
    .select({
      guest: guests,
      eventId: events.id,
      eventTitle: events.title,
      eventSlug: events.slug,
      eventIsPublished: events.isPublished,
      themeConfig: themes.config,
    })
    .from(guests)
    .leftJoin(events, eq(events.id, guests.eventId))
    .leftJoin(themes, eq(themes.id, events.themeId))
    .where(and(eq(guests.token, token), isNull(guests.deletedAt)))
    .limit(1);
  return row ?? null;
}
