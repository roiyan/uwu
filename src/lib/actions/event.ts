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
import {
  isAllowedBodyFont,
  isAllowedHeadingFont,
} from "@/lib/theme/fonts";
import { normaliseSectionOrder } from "@/lib/theme/sections";
import { logActivity } from "./activity";

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
    await logActivity({
      eventId,
      action: "update_couple",
      summary: "Memperbarui data mempelai",
    });
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

  if (result.ok) {
    revalidatePath("/dashboard/website");
    await logActivity({
      eventId,
      action: "update_schedule",
      summary: "Memperbarui jadwal acara",
    });
  }
  return result;
}

export async function selectThemeAction(
  eventId: string,
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const themeId = String(formData.get("themeId") ?? "");

  let themeName: string | null = null;
  const result = await withAuth(eventId, "editor", async () => {
    const [theme] = await db
      .select()
      .from(themes)
      .where(and(eq(themes.id, themeId), eq(themes.isActive, true)))
      .limit(1);
    if (!theme) throw new Error("Tema tidak tersedia");
    themeName = theme.name;

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
    await logActivity({
      eventId,
      action: "update_theme",
      summary: themeName
        ? `Mengganti tema ke ${themeName}`
        : "Mengganti tema",
      targetType: "theme",
      targetId: themeId,
    });
  }
  return result;
}

export async function updateThemeConfigAction(
  eventId: string,
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  // The editor posts the rich 6-slot palette as `palette6_<key>`. We
  // also derive the legacy 3-slot palette from the same submission so
  // the public invitation renderer (which still reads `palette`) stays
  // in lockstep until every consumer has migrated to `palette6`.
  const palette6Input = {
    background: emptyToNull(formData.get("palette6_background")) ?? undefined,
    headingText: emptyToNull(formData.get("palette6_headingText")) ?? undefined,
    bodyText: emptyToNull(formData.get("palette6_bodyText")) ?? undefined,
    brandPrimary:
      emptyToNull(formData.get("palette6_brandPrimary")) ?? undefined,
    brandLight: emptyToNull(formData.get("palette6_brandLight")) ?? undefined,
    brandDark: emptyToNull(formData.get("palette6_brandDark")) ?? undefined,
  };

  // Font submission. Each slot is gated by its category-specific
  // allow-list — heading accepts Serif/Script, body accepts
  // Serif/Sans. Anything else is silently dropped here so a crafted
  // form post can't smuggle an arbitrary `font-family` through.
  const headingRaw = emptyToNull(formData.get("fonts_heading")) ?? undefined;
  const bodyRaw = emptyToNull(formData.get("fonts_body")) ?? undefined;
  const fontsInput = {
    heading: isAllowedHeadingFont(headingRaw) ? headingRaw : undefined,
    body: isAllowedBodyFont(bodyRaw) ? bodyRaw : undefined,
  };

  const parsed = themeConfigSchema.safeParse({
    themeId: formData.get("themeId"),
    // Legacy 3-color (still accepted from older callers, otherwise
    // derived below from the 6-color submission).
    palette: {
      primary: emptyToNull(formData.get("palette_primary")) ?? undefined,
      secondary: emptyToNull(formData.get("palette_secondary")) ?? undefined,
      accent: emptyToNull(formData.get("palette_accent")) ?? undefined,
    },
    palette6: palette6Input,
    fonts: fontsInput,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  // Derive a legacy 3-color palette from the 6-color one when the
  // caller hasn't supplied an explicit `palette_*`.
  const p6 = parsed.data.palette6 ?? {};
  const legacy = parsed.data.palette ?? {};
  const mergedLegacy = {
    primary: legacy.primary ?? p6.brandPrimary,
    secondary: legacy.secondary ?? p6.background,
    accent: legacy.accent ?? p6.brandLight,
  };

  // Patch we want to apply this round. Sibling keys we don't touch
  // (e.g. a future sectionOrder field added by Feature 3) need to be
  // preserved so each editor panel can save independently without
  // wiping its peers — see the read-modify-write below.
  const patch = {
    palette: mergedLegacy,
    palette6: parsed.data.palette6 ?? {},
    fonts: parsed.data.fonts ?? {},
  };

  const result = await withAuth(eventId, "editor", async () => {
    const [existing] = await db
      .select({ config: eventThemeConfigs.config })
      .from(eventThemeConfigs)
      .where(
        and(
          eq(eventThemeConfigs.eventId, eventId),
          eq(eventThemeConfigs.themeId, parsed.data.themeId),
        ),
      )
      .limit(1);
    const merged = {
      ...((existing?.config as Record<string, unknown>) ?? {}),
      ...patch,
    };

    await db
      .insert(eventThemeConfigs)
      .values({
        eventId,
        themeId: parsed.data.themeId,
        config: merged,
      })
      .onConflictDoUpdate({
        target: [eventThemeConfigs.eventId, eventThemeConfigs.themeId],
        set: {
          config: merged,
          updatedAt: new Date(),
        },
      });
  });

  if (result.ok) {
    revalidatePath("/dashboard/website/theme");
    await logActivity({
      eventId,
      action: "update_theme",
      summary: "Memperbarui tampilan tema",
    });
  }
  return result;
}

/**
 * Persist the couple's preferred section render order. Single-purpose
 * action so the editor's drag-and-drop affordance can fire-and-forget
 * after each drop without resubmitting palette/fonts. Read-modify-
 * writes `eventThemeConfigs.config` so palette + fonts siblings
 * survive each save.
 *
 * The event must already be linked to a theme — without a themeId
 * there's no eventThemeConfigs row to upsert against, and creating a
 * "themeless" override would ghost-write a config that no read path
 * could resolve.
 */
export async function updateSectionOrderAction(
  eventId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const cleaned = normaliseSectionOrder(orderedIds);
  if (cleaned.length === 0) {
    return { ok: false, error: "Urutan bagian tidak valid." };
  }

  const result = await withAuth(eventId, "editor", async () => {
    const [eventRow] = await db
      .select({ themeId: events.themeId })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    if (!eventRow?.themeId) {
      throw new Error("Pilih tema terlebih dahulu sebelum mengubah urutan.");
    }
    const [existing] = await db
      .select({ config: eventThemeConfigs.config })
      .from(eventThemeConfigs)
      .where(
        and(
          eq(eventThemeConfigs.eventId, eventId),
          eq(eventThemeConfigs.themeId, eventRow.themeId),
        ),
      )
      .limit(1);
    const merged = {
      ...((existing?.config as Record<string, unknown>) ?? {}),
      sectionOrder: cleaned,
    };
    await db
      .insert(eventThemeConfigs)
      .values({
        eventId,
        themeId: eventRow.themeId,
        config: merged,
      })
      .onConflictDoUpdate({
        target: [eventThemeConfigs.eventId, eventThemeConfigs.themeId],
        set: {
          config: merged,
          updatedAt: new Date(),
        },
      });
  });

  if (result.ok) {
    revalidatePath("/dashboard/website");
    revalidatePath("/dashboard/website/theme");
  }
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
    timezone: formData.get("timezone") ?? "",
  });
  const ALLOWED_TIMEZONES = [
    "Asia/Jakarta","Asia/Makassar","Asia/Jayapura","Asia/Singapore",
    "Asia/Kuala_Lumpur","Asia/Tokyo","Asia/Dubai","Europe/London","America/New_York",
  ];
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
        timezone:
          parsed.data.timezone && ALLOWED_TIMEZONES.includes(parsed.data.timezone)
            ? parsed.data.timezone
            : "Asia/Jakarta",
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId));
  });

  if (result.ok) {
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard", "layout");
    await logActivity({
      eventId,
      action: "update_settings",
      summary: "Memperbarui pengaturan acara",
    });
  }
  return result;
}

export async function setCheckinEnabledAction(
  eventId: string,
  enabled: boolean,
): Promise<ActionResult> {
  const result = await withAuth(eventId, "editor", async () => {
    await db
      .update(events)
      .set({ checkinEnabled: enabled, updatedAt: new Date() })
      .where(eq(events.id, eventId));
  });

  if (result.ok) {
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/checkin");
    revalidatePath("/dashboard", "layout");
    await logActivity({
      eventId,
      action: "update_settings",
      summary: enabled
        ? "Mengaktifkan check-in"
        : "Menonaktifkan check-in",
    });
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
    await logActivity({
      eventId,
      action: "update_website",
      summary: "Memperbarui konten website",
    });
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
  if (result.ok) {
    revalidatePath("/dashboard", "layout");
    await logActivity({
      eventId,
      action: "publish_event",
      summary: "Mempublikasikan undangan",
    });
  }
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
  if (result.ok) {
    revalidatePath("/dashboard", "layout");
    await logActivity({
      eventId,
      action: "unpublish_event",
      summary: "Membatalkan publikasi undangan",
    });
  }
  return result;
}
