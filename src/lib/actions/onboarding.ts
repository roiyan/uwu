"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
import { requireAuthedUser } from "@/lib/auth-guard";
import { getCurrentEventForUser } from "@/lib/db/queries/events";
import { buildCoupleSlug } from "@/lib/utils/slug";
import {
  mempelaiSchema,
  schedulesSchema,
  themeSelectSchema,
} from "@/lib/schemas/event";
import type { ActionResult } from "@/lib/auth-guard";

async function ensureUniqueSlug(desired: string) {
  let candidate = desired;
  for (let i = 0; i < 5; i++) {
    const [hit] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.slug, candidate))
      .limit(1);
    if (!hit) return candidate;
    candidate = `${desired}-${Math.random().toString(36).slice(2, 5)}`;
  }
  return `${desired}-${Date.now().toString(36)}`;
}

async function defaultStarterPackageId() {
  const [p] = await db
    .select({ id: packages.id })
    .from(packages)
    .where(eq(packages.tier, "starter"))
    .limit(1);
  return p?.id ?? null;
}

export async function saveMempelaiAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
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

  let eventId: string;
  if (existing) {
    eventId = existing.event.id;
    await db
      .update(events)
      .set({ title, updatedAt: new Date() })
      .where(eq(events.id, eventId));
    await db
      .update(couples)
      .set({
        brideName,
        brideNickname: brideNickname || null,
        groomName,
        groomNickname: groomNickname || null,
        updatedAt: new Date(),
      })
      .where(eq(couples.eventId, eventId));
  } else {
    const slug = await ensureUniqueSlug(buildCoupleSlug(brideName, groomName));
    const starter = await defaultStarterPackageId();
    const [created] = await db
      .insert(events)
      .values({
        ownerId: user.id,
        slug,
        title,
        packageId: starter ?? null,
      })
      .returning({ id: events.id });
    eventId = created.id;
    await db.insert(couples).values({
      eventId,
      brideName,
      brideNickname: brideNickname || null,
      groomName,
      groomNickname: groomNickname || null,
    });
  }

  revalidatePath("/onboarding", "layout");
  revalidatePath("/dashboard", "layout");
  redirect("/onboarding/jadwal");
}

export async function saveJadwalAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireAuthedUser();
  const existing = await getCurrentEventForUser(user.id);
  if (!existing) {
    redirect("/onboarding/mempelai");
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

  revalidatePath("/onboarding", "layout");
  revalidatePath("/dashboard", "layout");
  redirect("/onboarding/tema");
}

export async function saveTemaAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireAuthedUser();
  const existing = await getCurrentEventForUser(user.id);
  if (!existing) {
    redirect("/onboarding/mempelai");
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

  revalidatePath("/onboarding", "layout");
  revalidatePath("/dashboard", "layout");
  redirect("/onboarding/selesai");
}

export async function finishOnboardingAction() {
  await requireAuthedUser();
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}
