"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  couples,
  eventSchedules,
  eventThemeConfigs,
  events,
  themes,
} from "@/lib/db/schema";
import { withAuth, type ActionResult } from "@/lib/auth-guard";
import {
  coupleDetailSchema,
  eventSettingsSchema,
  schedulesSchema,
  themeConfigSchema,
} from "@/lib/schemas/event";

function emptyToNull(v: FormDataEntryValue | null) {
  if (v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export async function updateCoupleAction(
  eventId: string,
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = coupleDetailSchema.safeParse({
    brideName: formData.get("brideName"),
    brideNickname: formData.get("brideNickname") ?? "",
    brideFatherName: formData.get("brideFatherName") ?? "",
    brideMotherName: formData.get("brideMotherName") ?? "",
    brideInstagram: formData.get("brideInstagram") ?? "",
    bridePhotoUrl: formData.get("bridePhotoUrl") ?? "",
    groomName: formData.get("groomName"),
    groomNickname: formData.get("groomNickname") ?? "",
    groomFatherName: formData.get("groomFatherName") ?? "",
    groomMotherName: formData.get("groomMotherName") ?? "",
    groomInstagram: formData.get("groomInstagram") ?? "",
    groomPhotoUrl: formData.get("groomPhotoUrl") ?? "",
    coverPhotoUrl: formData.get("coverPhotoUrl") ?? "",
    story: formData.get("story") ?? "",
    quote: formData.get("quote") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }
  const d = parsed.data;

  const result = await withAuth(eventId, "editor", async () => {
    // Run both UPDATEs in parallel — they hit different tables with no deps.
    const now = new Date();
    await Promise.all([
      db
        .update(couples)
        .set({
          brideName: d.brideName,
          brideNickname: d.brideNickname || null,
          brideFatherName: d.brideFatherName || null,
          brideMotherName: d.brideMotherName || null,
          brideInstagram: d.brideInstagram || null,
          bridePhotoUrl: d.bridePhotoUrl || null,
          groomName: d.groomName,
          groomNickname: d.groomNickname || null,
          groomFatherName: d.groomFatherName || null,
          groomMotherName: d.groomMotherName || null,
          groomInstagram: d.groomInstagram || null,
          groomPhotoUrl: d.groomPhotoUrl || null,
          coverPhotoUrl: d.coverPhotoUrl || null,
          story: d.story || null,
          quote: d.quote || null,
          updatedAt: now,
        })
        .where(eq(couples.eventId, eventId)),
      db
        .update(events)
        .set({
          title: `${d.brideName.split(" ")[0]} & ${d.groomName.split(" ")[0]}`,
          updatedAt: now,
        })
        .where(eq(events.id, eventId)),
    ]);
  });

  if (result.ok) {
    revalidatePath("/dashboard/website");
    revalidatePath("/dashboard", "layout");
  }
  return result;
}

export async function updateSchedulesAction(
  eventId: string,
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const raw = (formData.get("schedules") as string | null) ?? "[]";
  let parsedRaw: unknown;
  try {
    parsedRaw = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Data jadwal tidak valid." };
  }
  const parsed = schedulesSchema.safeParse(parsedRaw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Jadwal tidak valid" };
  }

  const result = await withAuth(eventId, "editor", async () => {
    // Batch delete+insert inside a single transaction = 1 round-trip.
    await db.transaction(async (tx) => {
      await tx.delete(eventSchedules).where(eq(eventSchedules.eventId, eventId));
      if (parsed.data.length > 0) {
        await tx.insert(eventSchedules).values(
          parsed.data.map((s, idx) => ({
            eventId,
            label: s.label,
            eventDate: s.eventDate,
            startTime: s.startTime || null,
            endTime: s.endTime || null,
            timezone: s.timezone || "Asia/Jakarta",
            venueName: s.venueName || null,
            venueAddress: s.venueAddress || null,
            venueMapUrl: s.venueMapUrl || null,
            sortOrder: idx,
          })),
        );
      }
    });
  });

  if (result.ok) revalidatePath("/dashboard/website");
  return result;
}

export async function selectThemeAction(
  eventId: string,
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const themeId = String(formData.get("themeId") ?? "");

  const result = await withAuth(eventId, "editor", async () => {
    const [theme] = await db
      .select()
      .from(themes)
      .where(and(eq(themes.id, themeId), eq(themes.isActive, true)))
      .limit(1);
    if (!theme) throw new Error("Tema tidak tersedia");

    const now = new Date();
    await Promise.all([
      db
        .update(events)
        .set({ themeId: theme.id, updatedAt: now })
        .where(eq(events.id, eventId)),
      db
        .insert(eventThemeConfigs)
        .values({ eventId, themeId: theme.id, config: {} })
        .onConflictDoUpdate({
          target: [eventThemeConfigs.eventId, eventThemeConfigs.themeId],
          set: { updatedAt: now },
        }),
    ]);
  });

  if (result.ok) {
    revalidatePath("/dashboard/website/theme");
    revalidatePath("/dashboard", "layout");
  }
  return result;
}

export async function updateThemeConfigAction(
  eventId: string,
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = themeConfigSchema.safeParse({
    themeId: formData.get("themeId"),
    palette: {
      primary: emptyToNull(formData.get("palette_primary")) ?? undefined,
      secondary: emptyToNull(formData.get("palette_secondary")) ?? undefined,
      accent: emptyToNull(formData.get("palette_accent")) ?? undefined,
    },
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const result = await withAuth(eventId, "editor", async () => {
    await db
      .insert(eventThemeConfigs)
      .values({
        eventId,
        themeId: parsed.data.themeId,
        config: { palette: parsed.data.palette ?? {} },
      })
      .onConflictDoUpdate({
        target: [eventThemeConfigs.eventId, eventThemeConfigs.themeId],
        set: {
          config: { palette: parsed.data.palette ?? {} },
          updatedAt: new Date(),
        },
      });
  });

  if (result.ok) revalidatePath("/dashboard/website/theme");
  return result;
}

export async function updateEventSettingsAction(
  eventId: string,
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = eventSettingsSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    culturalPreference: formData.get("culturalPreference"),
    musicUrl: formData.get("musicUrl") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const result = await withAuth(eventId, "editor", async () => {
    const [clash] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.slug, parsed.data.slug), ne(events.id, eventId)))
      .limit(1);
    if (clash) throw new Error("Slug sudah dipakai pasangan lain. Coba slug lain.");

    await db
      .update(events)
      .set({
        title: parsed.data.title,
        slug: parsed.data.slug,
        culturalPreference: parsed.data.culturalPreference,
        musicUrl: parsed.data.musicUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId));
  });

  if (result.ok) {
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard", "layout");
  }
  return result;
}

// Combined save for the split-view website editor. One round-trip from the
// client, one transaction on the DB. The Couple + Schedules payloads are
// validated independently so a partial failure returns the specific error.
export async function saveWebsiteDraftAction(
  eventId: string,
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const coupleParsed = coupleDetailSchema.safeParse({
    brideName: formData.get("brideName"),
    brideNickname: formData.get("brideNickname") ?? "",
    brideFatherName: formData.get("brideFatherName") ?? "",
    brideMotherName: formData.get("brideMotherName") ?? "",
    brideInstagram: formData.get("brideInstagram") ?? "",
    bridePhotoUrl: formData.get("bridePhotoUrl") ?? "",
    groomName: formData.get("groomName"),
    groomNickname: formData.get("groomNickname") ?? "",
    groomFatherName: formData.get("groomFatherName") ?? "",
    groomMotherName: formData.get("groomMotherName") ?? "",
    groomInstagram: formData.get("groomInstagram") ?? "",
    groomPhotoUrl: formData.get("groomPhotoUrl") ?? "",
    coverPhotoUrl: formData.get("coverPhotoUrl") ?? "",
    story: formData.get("story") ?? "",
    quote: formData.get("quote") ?? "",
  });
  if (!coupleParsed.success) {
    return {
      ok: false,
      error: coupleParsed.error.issues[0]?.message ?? "Data mempelai tidak valid",
    };
  }

  const raw = (formData.get("schedules") as string | null) ?? "[]";
  let scheduleRaw: unknown;
  try {
    scheduleRaw = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Data jadwal tidak valid." };
  }
  const scheduleParsed = schedulesSchema.safeParse(scheduleRaw);
  if (!scheduleParsed.success) {
    return {
      ok: false,
      error: scheduleParsed.error.issues[0]?.message ?? "Jadwal tidak valid",
    };
  }

  const d = coupleParsed.data;
  const schedules = scheduleParsed.data;

  const result = await withAuth(eventId, "editor", async () => {
    const now = new Date();
    await db.transaction(async (tx) => {
      await Promise.all([
        tx
          .update(couples)
          .set({
            brideName: d.brideName,
            brideNickname: d.brideNickname || null,
            brideFatherName: d.brideFatherName || null,
            brideMotherName: d.brideMotherName || null,
            brideInstagram: d.brideInstagram || null,
            bridePhotoUrl: d.bridePhotoUrl || null,
            groomName: d.groomName,
            groomNickname: d.groomNickname || null,
            groomFatherName: d.groomFatherName || null,
            groomMotherName: d.groomMotherName || null,
            groomInstagram: d.groomInstagram || null,
            groomPhotoUrl: d.groomPhotoUrl || null,
            coverPhotoUrl: d.coverPhotoUrl || null,
            story: d.story || null,
            quote: d.quote || null,
            updatedAt: now,
          })
          .where(eq(couples.eventId, eventId)),
        tx
          .update(events)
          .set({
            title: `${d.brideName.split(" ")[0]} & ${d.groomName.split(" ")[0]}`,
            updatedAt: now,
          })
          .where(eq(events.id, eventId)),
      ]);

      await tx
        .delete(eventSchedules)
        .where(eq(eventSchedules.eventId, eventId));
      if (schedules.length > 0) {
        await tx.insert(eventSchedules).values(
          schedules.map((s, idx) => ({
            eventId,
            label: s.label,
            eventDate: s.eventDate,
            startTime: s.startTime || null,
            endTime: s.endTime || null,
            timezone: s.timezone || "Asia/Jakarta",
            venueName: s.venueName || null,
            venueAddress: s.venueAddress || null,
            venueMapUrl: s.venueMapUrl || null,
            sortOrder: idx,
          })),
        );
      }
    });
  });

  if (result.ok) {
    revalidatePath("/dashboard/website");
    revalidatePath("/preview");
    revalidatePath("/dashboard", "layout");
  }
  return result;
}

export async function publishEventAction(
  eventId: string,
): Promise<ActionResult> {
  const result = await withAuth(eventId, "admin", async () => {
    await db
      .update(events)
      .set({ isPublished: true, publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(events.id, eventId));
  });
  if (result.ok) revalidatePath("/dashboard", "layout");
  return result;
}

export async function unpublishEventAction(
  eventId: string,
): Promise<ActionResult> {
  const result = await withAuth(eventId, "admin", async () => {
    await db
      .update(events)
      .set({ isPublished: false, updatedAt: new Date() })
      .where(eq(events.id, eventId));
  });
  if (result.ok) revalidatePath("/dashboard", "layout");
  return result;
}
