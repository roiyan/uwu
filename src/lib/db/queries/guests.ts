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

// Seven default groups seeded the first time a user opens /guests.
// Keeps onboarding flow untouched — the inserts fire only when the
// event has zero groups yet.
export const DEFAULT_GUEST_GROUPS = [
  "Keluarga Mempelai Wanita",
  "Keluarga Mempelai Pria",
  "Teman Mempelai Wanita",
  "Teman Mempelai Pria",
  "Teman Sekolah",
  "Teman Kantor",
  "Tetangga",
] as const;

export async function listGuestGroups(eventId: string) {
  const rows = await db
    .select()
    .from(guestGroups)
    .where(eq(guestGroups.eventId, eventId))
    .orderBy(asc(guestGroups.sortOrder), asc(guestGroups.name));

  if (rows.length > 0) return rows;

  // Lazy seed defaults on first access. onConflictDoNothing in case two
  // renders race to seed (very unlikely, but cheap to handle).
  await db
    .insert(guestGroups)
    .values(
      DEFAULT_GUEST_GROUPS.map((name, i) => ({
        eventId,
        name,
        sortOrder: i,
      })),
    )
    .onConflictDoNothing();

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

/**
 * Daily opens for the last N days, used by the Beranda time-series
 * chart. Buckets `opened_at` by date in UTC so the result is stable
 * across server restarts. Days with zero opens are filled in by the
 * caller — this query only returns dates that actually had events.
 */
export async function getDailyOpens(eventId: string, days = 7) {
  const sinceSql = sql`now() - (${days}::int || ' days')::interval`;
  const rows = await db
    .select({
      date: sql<string>`to_char(date_trunc('day', ${guests.openedAt}), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(guests)
    .where(
      and(
        eq(guests.eventId, eventId),
        isNull(guests.deletedAt),
        sql`${guests.openedAt} is not null`,
        sql`${guests.openedAt} >= ${sinceSql}`,
      ),
    )
    .groupBy(sql`date_trunc('day', ${guests.openedAt})`)
    .orderBy(sql`date_trunc('day', ${guests.openedAt}) asc`);
  return rows;
}

/**
 * Aggregate counts for the Beranda response funnel. All five tiers
 * computed in a single round-trip via `count(*) filter (where ...)`.
 */
export async function getResponseFunnel(eventId: string) {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      invited: sql<number>`count(*) filter (where ${guests.sendCount} > 0)::int`,
      opened: sql<number>`count(*) filter (where ${guests.openedAt} is not null)::int`,
      responded: sql<number>`count(*) filter (where ${guests.rsvpStatus} in ('hadir','tidak_hadir'))::int`,
      attending: sql<number>`count(*) filter (where ${guests.rsvpStatus} = 'hadir')::int`,
    })
    .from(guests)
    .where(and(eq(guests.eventId, eventId), isNull(guests.deletedAt)));
  return {
    total: row?.total ?? 0,
    invited: row?.invited ?? 0,
    opened: row?.opened ?? 0,
    responded: row?.responded ?? 0,
    attending: row?.attending ?? 0,
  };
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
