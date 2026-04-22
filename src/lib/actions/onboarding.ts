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

// buildCoupleSlug already appends a 6-char random base36 suffix, so a
// clash on events.slug (UNIQUE) is vanishingly unlikely. Skipping the
// pre-flight SELECT saves a round-trip on every first onboarding; if a
// clash does happen the transaction surfaces 23505 and the user retries.

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

  let eventId: string;
  const now = new Date();
  if (existing) {
    eventId = existing.event.id;
    // Independent table writes — fire in parallel.
    await Promise.all([
      db
        .update(events)
        .set({ title, updatedAt: now })
        .where(eq(events.id, eventId)),
      db
        .update(couples)
        .set({
          brideName,
          brideNickname: brideNickname || null,
          groomName,
          groomNickname: groomNickname || null,
          updatedAt: now,
        })
        .where(eq(couples.eventId, eventId)),
    ]);
  } else {
    // First-time path: slug is generated client-side; starter pkg lookup
    // is the only dependency we need before the transaction.
    const slug = buildCoupleSlug(brideName, groomName);
    const starter = await defaultStarterPackageId();
    // events.id is needed by couples FK, so must sequence these two — but
    // wrap in a single transaction to avoid two auth round-trips.
    eventId = await db.transaction(async (tx) => {
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
      return created.id;
    });
  }

  console.log(`[ACTION] saveMempelai: ${Math.round(performance.now() - t0)}ms`);
  revalidatePath("/onboarding", "layout");
  revalidatePath("/dashboard", "layout");
  redirect("/onboarding/jadwal");
}

export async function saveJadwalAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const t0 = performance.now();
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

  console.log(`[ACTION] saveJadwal: ${Math.round(performance.now() - t0)}ms`);
  revalidatePath("/onboarding", "layout");
  revalidatePath("/dashboard", "layout");
  redirect("/onboarding/tema");
}

export async function saveTemaAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const t0 = performance.now();
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

  console.log(`[ACTION] saveTema: ${Math.round(performance.now() - t0)}ms`);
  revalidatePath("/onboarding", "layout");
  revalidatePath("/dashboard", "layout");
  redirect("/onboarding/selesai");
}

export async function finishOnboardingAction() {
  await requireAuthedUser();
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}
