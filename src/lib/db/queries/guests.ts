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
      nickname: guests.nickname,
      phone: guests.phone,
      email: guests.email,
      token: guests.token,
      rsvpStatus: guests.rsvpStatus,
      rsvpAttendees: guests.rsvpAttendees,
      rsvpMessage: guests.rsvpMessage,
      rsvpedAt: guests.rsvpedAt,
      openedAt: guests.openedAt,
      invitedAt: guests.invitedAt,
      lastSentAt: guests.lastSentAt,
      lastSentVia: guests.lastSentVia,
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
 * Optional `groupId` filters the same aggregate to a single guest
 * group — used by the Analytics funnel filter.
 */
export async function getResponseFunnel(eventId: string, groupId?: string) {
  const conditions = [eq(guests.eventId, eventId), isNull(guests.deletedAt)];
  if (groupId) conditions.push(eq(guests.groupId, groupId));

  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      invited: sql<number>`count(*) filter (where ${guests.sendCount} > 0)::int`,
      opened: sql<number>`count(*) filter (where ${guests.openedAt} is not null)::int`,
      responded: sql<number>`count(*) filter (where ${guests.rsvpStatus} in ('hadir','tidak_hadir'))::int`,
      attending: sql<number>`count(*) filter (where ${guests.rsvpStatus} = 'hadir')::int`,
    })
    .from(guests)
    .where(and(...conditions));
  return {
    total: row?.total ?? 0,
    invited: row?.invited ?? 0,
    opened: row?.opened ?? 0,
    responded: row?.responded ?? 0,
    attending: row?.attending ?? 0,
  };
}

/**
 * Per-day rollups across the four metrics tracked on the Analytics
 * KPI strip. Buckets `created_at` (registrations), `opened_at`
 * (opens), `rsvped_at` (rsvps) per UTC day. Returned rows include
 * gaps — the chart fills in zero for missing days client-side.
 */
export async function getWeeklyTrend(eventId: string, days = 7) {
  const sinceSql = sql`now() - (${days}::int || ' days')::interval`;
  const rows = await db
    .select({
      date: sql<string>`to_char(d::date, 'YYYY-MM-DD')`,
      registered: sql<number>`(
        select count(*)::int from ${guests}
        where ${guests.eventId} = ${eventId}
          and ${guests.deletedAt} is null
          and date_trunc('day', ${guests.createdAt}) = d
      )`,
      opened: sql<number>`(
        select count(*)::int from ${guests}
        where ${guests.eventId} = ${eventId}
          and ${guests.deletedAt} is null
          and date_trunc('day', ${guests.openedAt}) = d
      )`,
      rsvped: sql<number>`(
        select count(*)::int from ${guests}
        where ${guests.eventId} = ${eventId}
          and ${guests.deletedAt} is null
          and date_trunc('day', ${guests.rsvpedAt}) = d
      )`,
      attending: sql<number>`(
        select count(*)::int from ${guests}
        where ${guests.eventId} = ${eventId}
          and ${guests.deletedAt} is null
          and ${guests.rsvpStatus} = 'hadir'
          and date_trunc('day', ${guests.rsvpedAt}) = d
      )`,
    })
    .from(
      sql`generate_series(date_trunc('day', ${sinceSql}), date_trunc('day', now()), '1 day'::interval) as d`,
    )
    .orderBy(sql`d asc`);
  return rows;
}

/**
 * Flat guest list for the Analytics response table — name, status,
 * timestamps, last channel sent. Sorted with most-recent rsvps first
 * so the table opens to the most relevant rows.
 */
export async function listGuestsWithActivity(eventId: string) {
  return db
    .select({
      id: guests.id,
      name: guests.name,
      nickname: guests.nickname,
      groupName: guestGroups.name,
      groupColor: guestGroups.color,
      rsvpStatus: guests.rsvpStatus,
      rsvpAttendees: guests.rsvpAttendees,
      rsvpMessage: guests.rsvpMessage,
      sendCount: guests.sendCount,
      openedAt: guests.openedAt,
      rsvpedAt: guests.rsvpedAt,
      lastSentAt: guests.lastSentAt,
      lastSentVia: guests.lastSentVia,
    })
    .from(guests)
    .leftJoin(guestGroups, eq(guestGroups.id, guests.groupId))
    .where(and(eq(guests.eventId, eventId), isNull(guests.deletedAt)))
    .orderBy(
      sql`${guests.rsvpedAt} desc nulls last`,
      sql`${guests.openedAt} desc nulls last`,
      sql`${guests.createdAt} desc`,
    )
    .limit(100);
}

/**
 * Traffic source breakdown for the Analytics page — counts opens grouped
 * by the channel the invitation was last sent through. Buckets: whatsapp,
 * email, direct (no send recorded yet — likely link-shared manually).
 */
export async function getTrafficSourceBreakdown(eventId: string) {
  const rows = await db
    .select({
      via: guests.lastSentVia,
      total: sql<number>`count(*)::int`,
      opened: sql<number>`count(*) filter (where ${guests.openedAt} is not null)::int`,
    })
    .from(guests)
    .where(and(eq(guests.eventId, eventId), isNull(guests.deletedAt)))
    .groupBy(guests.lastSentVia);
  const out = { whatsapp: 0, email: 0, direct: 0 };
  for (const r of rows) {
    if (r.via === "whatsapp") out.whatsapp = r.total;
    else if (r.via === "email") out.email = r.total;
    else out.direct += r.total;
  }
  return out;
}

/**
 * Per-group engagement for the Analytics breakdown card. Returns the
 * group's RSVP-attending count over its live total. Groups without any
 * guests are omitted — the card highlights the engaged groups.
 */
export async function getGroupEngagement(eventId: string) {
  const rows = await db
    .select({
      groupId: guestGroups.id,
      name: guestGroups.name,
      color: guestGroups.color,
      total: sql<number>`count(${guests.id})::int`,
      attending: sql<number>`count(*) filter (where ${guests.rsvpStatus} = 'hadir')::int`,
      opened: sql<number>`count(*) filter (where ${guests.openedAt} is not null)::int`,
    })
    .from(guestGroups)
    .leftJoin(
      guests,
      and(eq(guests.groupId, guestGroups.id), isNull(guests.deletedAt)),
    )
    .where(eq(guestGroups.eventId, eventId))
    .groupBy(guestGroups.id, guestGroups.name, guestGroups.color)
    .orderBy(asc(guestGroups.sortOrder), asc(guestGroups.name));
  return rows.map((r) => ({
    id: r.groupId,
    name: r.name,
    color: r.color,
    total: r.total,
    attending: r.attending,
    opened: r.opened,
  }));
}

/**
 * 7×24 grid of opens by day-of-week and hour, used for the Pola
 * Aktivitas heatmap. Day-of-week comes back as 0=Sunday … 6=Saturday
 * to match JS Date.getDay(). Bucket counts are 0 when nothing happened
 * in that slot — the renderer fills the matrix from this sparse list.
 *
 * Time zone: opened_at is stored as `timestamptz`. Postgres'
 * `extract()` against a timestamptz uses the database session's
 * timezone (UTC on Supabase), which produced the "WIB 16:00 looks
 * like 09:00 SAB" off-by-7 the heatmap was showing. We coerce to
 * Asia/Jakarta with `AT TIME ZONE 'Asia/Jakarta'` before extracting
 * — the result is a `timestamp without time zone` that represents
 * the wall-clock value the operator actually wants to bucket on.
 */
export async function getOpenHeatmap(
  eventId: string,
  timezone: string = "Asia/Jakarta",
) {
  const tz = /^[A-Za-z]+(?:\/[A-Za-z_+\-0-9]+){0,2}$/.test(timezone)
    ? timezone
    : "Asia/Jakarta";
  const localOpenedAt = sql.raw(`("guests"."opened_at" at time zone '${tz}')`);
  const rows = await db
    .select({
      day: sql<number>`extract(dow from ${localOpenedAt})::int`,
      hour: sql<number>`extract(hour from ${localOpenedAt})::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(guests)
    .where(
      and(
        eq(guests.eventId, eventId),
        isNull(guests.deletedAt),
        sql`${guests.openedAt} is not null`,
      ),
    )
    .groupBy(
      sql`extract(dow from ${localOpenedAt})`,
      sql`extract(hour from ${localOpenedAt})`,
    );
  return rows;
}

/**
 * Top-5 most engaged guests for the leaderboard. Ranked by RSVP
 * (responded > not) then by openedAt presence then by send count.
 * `sendCount` doubles as a proxy for "buka berkali" until we track
 * per-open events.
 */
export async function listTopOpeners(eventId: string, limit = 5) {
  return db
    .select({
      id: guests.id,
      name: guests.name,
      groupName: guestGroups.name,
      groupColor: guestGroups.color,
      rsvpStatus: guests.rsvpStatus,
      rsvpAttendees: guests.rsvpAttendees,
      sendCount: guests.sendCount,
      openedAt: guests.openedAt,
      rsvpedAt: guests.rsvpedAt,
    })
    .from(guests)
    .leftJoin(guestGroups, eq(guestGroups.id, guests.groupId))
    .where(
      and(
        eq(guests.eventId, eventId),
        isNull(guests.deletedAt),
        sql`(${guests.openedAt} is not null or ${guests.rsvpedAt} is not null)`,
      ),
    )
    .orderBy(
      sql`case when ${guests.rsvpStatus} = 'hadir' then 0
                when ${guests.rsvpStatus} = 'tidak_hadir' then 1
                when ${guests.openedAt} is not null then 2
                else 3 end asc`,
      sql`${guests.sendCount} desc`,
      sql`${guests.openedAt} desc nulls last`,
    )
    .limit(limit);
}

/**
 * RSVP messages with sender + group context for the Analytics "Ucapan
 * Tamu" card. Filtered to non-empty messages so the card only renders
 * actual wishes; ordered newest-first. Caller decides the limit (3 in
 * the analytics card today, full list in any future modal).
 */
export async function listGuestWishes(eventId: string, limit = 3) {
  return db
    .select({
      id: guests.id,
      name: guests.name,
      message: guests.rsvpMessage,
      groupName: guestGroups.name,
      groupColor: guestGroups.color,
      rsvpedAt: guests.rsvpedAt,
      attendees: guests.rsvpAttendees,
    })
    .from(guests)
    .leftJoin(guestGroups, eq(guestGroups.id, guests.groupId))
    .where(
      and(
        eq(guests.eventId, eventId),
        isNull(guests.deletedAt),
        sql`${guests.rsvpMessage} is not null`,
        sql`length(trim(${guests.rsvpMessage})) > 0`,
      ),
    )
    .orderBy(sql`${guests.rsvpedAt} desc nulls last`)
    .limit(limit);
}

/**
 * Total count of guests who left an RSVP message — used for the
 * "X ucapan dari Y tamu" footer line on the wishes card.
 */
export async function countGuestWishes(eventId: string) {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(guests)
    .where(
      and(
        eq(guests.eventId, eventId),
        isNull(guests.deletedAt),
        sql`${guests.rsvpMessage} is not null`,
        sql`length(trim(${guests.rsvpMessage})) > 0`,
      ),
    );
  return row?.total ?? 0;
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
