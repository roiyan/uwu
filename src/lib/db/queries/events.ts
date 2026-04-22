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

export async function getCurrentEventForUser(userId: string) {
  const [row] = await db
    .select({ event: events, theme: themes })
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
}

export async function getEventBundle(eventId: string) {
  const [eventRow] = await db
    .select({ event: events, theme: themes })
    .from(events)
    .leftJoin(themes, eq(themes.id, events.themeId))
    .where(and(eq(events.id, eventId), isNull(events.deletedAt)))
    .limit(1);
  if (!eventRow) return null;

  const [couple] = await db
    .select()
    .from(couples)
    .where(eq(couples.eventId, eventId))
    .limit(1);

  const schedules = await db
    .select()
    .from(eventSchedules)
    .where(eq(eventSchedules.eventId, eventId))
    .orderBy(asc(eventSchedules.sortOrder), asc(eventSchedules.eventDate));

  const themeConfig = eventRow.event.themeId
    ? await db
        .select()
        .from(eventThemeConfigs)
        .where(
          and(
            eq(eventThemeConfigs.eventId, eventId),
            eq(eventThemeConfigs.themeId, eventRow.event.themeId),
          ),
        )
        .limit(1)
        .then((rows) => rows[0] ?? null)
    : null;

  return {
    event: eventRow.event,
    theme: eventRow.theme,
    couple: couple ?? null,
    schedules,
    themeConfig,
  };
}

export async function getPublishedEventBySlug(slug: string) {
  const [row] = await db
    .select({ event: events, theme: themes })
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

  const [couple] = await db
    .select()
    .from(couples)
    .where(eq(couples.eventId, row.event.id))
    .limit(1);
  const schedules = await db
    .select()
    .from(eventSchedules)
    .where(eq(eventSchedules.eventId, row.event.id))
    .orderBy(asc(eventSchedules.sortOrder), asc(eventSchedules.eventDate));

  return {
    event: row.event,
    theme: row.theme,
    couple: couple ?? null,
    schedules,
  };
}

export async function listThemes() {
  return db
    .select()
    .from(themes)
    .where(eq(themes.isActive, true))
    .orderBy(asc(themes.tier), asc(themes.name));
}
