import { cache } from "react";
import { and, asc, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  couples,
  eventMembers,
  eventSchedules,
  eventThemeConfigs,
  events,
  themes,
} from "@/lib/db/schema";

// Explicit column projection for the events table.
//
// We list the columns we actually render here so a future migration
// that adds a column the production DB hasn't received yet doesn't
// crash these read paths via Drizzle's full-table `select({ event: events })`.
function eventCoreCols() {
  return {
    id: events.id,
    ownerId: events.ownerId,
    slug: events.slug,
    title: events.title,
    ownerRole: events.ownerRole,
    themeId: events.themeId,
    packageId: events.packageId,
    culturalPreference: events.culturalPreference,
    musicUrl: events.musicUrl,
    timezone: events.timezone,
    isPublished: events.isPublished,
    publishedAt: events.publishedAt,
    checkinEnabled: events.checkinEnabled,
    createdAt: events.createdAt,
    updatedAt: events.updatedAt,
    deletedAt: events.deletedAt,
  };
}

// React cache() dedupes calls with the same args within a single server render.
// The dashboard layout + its child page both call these — without dedup we'd
// issue the same query twice per navigation.
export const getCurrentEventForUser = cache(async function getCurrentEventForUser(
  userId: string,
) {
  const [row] = await db
    .select({ event: eventCoreCols(), theme: themes })
    .from(events)
    .leftJoin(themes, eq(themes.id, events.themeId))
    .leftJoin(
      eventMembers,
      and(eq(eventMembers.eventId, events.id), eq(eventMembers.userId, userId)),
    )
    .where(
      and(
        isNull(events.deletedAt),
        or(eq(events.ownerId, userId), eq(eventMembers.userId, userId)),
      ),
    )
    .orderBy(desc(events.createdAt))
    .limit(1);
  return row ?? null;
});

export const getEventBundle = cache(async function getEventBundle(eventId: string) {
  const [eventRow] = await db
    .select({ event: eventCoreCols(), theme: themes })
    .from(events)
    .leftJoin(themes, eq(themes.id, events.themeId))
    .where(and(eq(events.id, eventId), isNull(events.deletedAt)))
    .limit(1);
  if (!eventRow) return null;

  // Fan out the three dependent reads in parallel — each table is independent.
  const [coupleRow, schedules, themeConfig] = await Promise.all([
    db
      .select()
      .from(couples)
      .where(eq(couples.eventId, eventId))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select()
      .from(eventSchedules)
      .where(eq(eventSchedules.eventId, eventId))
      .orderBy(asc(eventSchedules.sortOrder), asc(eventSchedules.eventDate)),
    eventRow.event.themeId
      ? db
          .select()
          .from(eventThemeConfigs)
          .where(
            and(
              eq(eventThemeConfigs.eventId, eventId),
              eq(eventThemeConfigs.themeId, eventRow.event.themeId),
            ),
          )
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  return {
    event: eventRow.event,
    theme: eventRow.theme,
    couple: coupleRow,
    schedules,
    themeConfig,
  };
});

export const getPublishedEventBySlug = cache(async function getPublishedEventBySlug(
  slug: string,
) {
  const [row] = await db
    .select({ event: eventCoreCols(), theme: themes })
    .from(events)
    .leftJoin(themes, eq(themes.id, events.themeId))
    .where(
      and(
        eq(events.slug, slug),
        eq(events.isPublished, true),
        isNull(events.deletedAt),
      ),
    )
    .limit(1);
  if (!row) return null;

  const [couple, schedules] = await Promise.all([
    db
      .select()
      .from(couples)
      .where(eq(couples.eventId, row.event.id))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select()
      .from(eventSchedules)
      .where(eq(eventSchedules.eventId, row.event.id))
      .orderBy(asc(eventSchedules.sortOrder), asc(eventSchedules.eventDate)),
  ]);

  return {
    event: row.event,
    theme: row.theme,
    couple,
    schedules,
  };
});

export const listThemes = cache(async function listThemes() {
  return db
    .select()
    .from(themes)
    .where(eq(themes.isActive, true))
    .orderBy(asc(themes.tier), asc(themes.name));
});
