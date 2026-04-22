"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  couples,
  eventSchedules,
  eventThemeConfigs,
  events,
  packages,
  themes,
} from "@/lib/db/schema";
import { requireSessionUserFast as requireAuthedUser } from "@/lib/auth-guard";
import { getCurrentEventForUser } from "@/lib/db/queries/events";
import { buildCoupleSlug } from "@/lib/utils/slug";
import {
  mempelaiSchema,
  schedulesSchema,
  themeSelectSchema,
} from "@/lib/schemas/event";
import type { ActionResult } from "@/lib/auth-guard";

type Next = { next: string };

// buildCoupleSlug already appends 6 chars of base36 entropy; slug collision
// on events.slug (UNIQUE) is vanishingly unlikely — if it ever happens the
// transaction surfaces 23505 and the user retries.

async function defaultStarterPackageId() {
  const [p] = await db
    .select({ id: packages.id })
    .from(packages)
    .where(eq(packages.tier, "starter"))
    .limit(1);
  return p?.id ?? null;
}

// NOTE: onboarding actions intentionally do NOT call redirect() or
// revalidatePath(). The client drives navigation via router.push() after the
// success toast, which uses Next's prefetched chunks (soft nav, no full SSR).
// revalidatePath('/onboarding', 'layout') here used to nuke the whole router
// cache and force a ~2-4 s SSR on the destination — exactly the symptom users
// reported. Returning { next } keeps the client in charge of the transition.

export async function saveMempelaiAction(
  _: ActionResult<Next> | null,
  formData: FormData,
): Promise<ActionResult<Next>> {
  const t0 = performance.now();
  const user = await requireAuthedUser();
  const parsed = mempelaiSchema.safeParse({
    brideName: formData.get("brideName"),
    brideNickname: formData.get("brideNickname") || undefined,
    groomName: formData.get("groomName"),
    groomNickname: formData.get("groomNickname") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }
  const { brideName, brideNickname, groomName, groomNickname } = parsed.data;

  const existing = await getCurrentEventForUser(user.id);
  const title = `${brideName.split(" ")[0]} & ${groomName.split(" ")[0]}`;
  const now = new Date();

  if (existing) {
    await Promise.all([
      db
        .update(events)
        .set({ title, updatedAt: now })
        .where(eq(events.id, existing.event.id)),
      db
        .update(couples)
        .set({
          brideName,
          brideNickname: brideNickname || null,
          groomName,
          groomNickname: groomNickname || null,
          updatedAt: now,
        })
        .where(eq(couples.eventId, existing.event.id)),
    ]);
  } else {
    const slug = buildCoupleSlug(brideName, groomName);
    const starter = await defaultStarterPackageId();
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(events)
        .values({
          ownerId: user.id,
          slug,
          title,
          packageId: starter ?? null,
        })
        .returning({ id: events.id });
      await tx.insert(couples).values({
        eventId: created.id,
        brideName,
        brideNickname: brideNickname || null,
        groomName,
        groomNickname: groomNickname || null,
      });
    });
  }

  console.log(`[ACTION] saveMempelai: ${Math.round(performance.now() - t0)}ms`);
  return { ok: true, data: { next: "/onboarding/jadwal" } };
}

export async function saveJadwalAction(
  _: ActionResult<Next> | null,
  formData: FormData,
): Promise<ActionResult<Next>> {
  const t0 = performance.now();
  const user = await requireAuthedUser();
  const existing = await getCurrentEventForUser(user.id);
  if (!existing) {
    return { ok: true, data: { next: "/onboarding/mempelai" } };
  }
  const eventId = existing.event.id;

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

  console.log(`[ACTION] saveJadwal: ${Math.round(performance.now() - t0)}ms`);
  return { ok: true, data: { next: "/onboarding/tema" } };
}

export async function saveTemaAction(
  _: ActionResult<Next> | null,
  formData: FormData,
): Promise<ActionResult<Next>> {
  const t0 = performance.now();
  const user = await requireAuthedUser();
  const existing = await getCurrentEventForUser(user.id);
  if (!existing) {
    return { ok: true, data: { next: "/onboarding/mempelai" } };
  }
  const eventId = existing.event.id;

  const parsed = themeSelectSchema.safeParse({ themeId: formData.get("themeId") });
  if (!parsed.success) {
    return { ok: false, error: "Silakan pilih tema terlebih dahulu." };
  }

  const [theme] = await db
    .select()
    .from(themes)
    .where(and(eq(themes.id, parsed.data.themeId), eq(themes.isActive, true)))
    .limit(1);
  if (!theme) {
    return { ok: false, error: "Tema tidak tersedia." };
  }

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

  console.log(`[ACTION] saveTema: ${Math.round(performance.now() - t0)}ms`);
  return { ok: true, data: { next: "/onboarding/selesai" } };
}

export async function finishOnboardingAction(): Promise<ActionResult<Next>> {
  await requireAuthedUser();
  return { ok: true, data: { next: "/dashboard" } };
}
