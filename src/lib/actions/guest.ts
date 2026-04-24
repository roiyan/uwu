"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { guestGroups, guests } from "@/lib/db/schema";
import { withAuth, type ActionResult } from "@/lib/auth-guard";
import {
  guestGroupInputSchema,
  guestInputSchema,
} from "@/lib/schemas/guest";
import { getEventPackageLimit } from "@/lib/db/queries/guests";

function optional(v: FormDataEntryValue | null) {
  if (v === null) return "";
  return String(v).trim();
}

async function assertBelowLimit(eventId: string) {
  const { limit } = await getEventPackageLimit(eventId);
  const [row] = await db
    .select({ total: count() })
    .from(guests)
    .where(and(eq(guests.eventId, eventId), isNull(guests.deletedAt)));
  if ((row?.total ?? 0) >= limit) {
    throw new Error(
      `Batas paket Anda ${limit} tamu sudah tercapai. Upgrade paket untuk menambah.`,
    );
  }
}

export async function createGuestAction(
  eventId: string,
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = guestInputSchema.safeParse({
    name: formData.get("name"),
    phone: optional(formData.get("phone")),
    email: optional(formData.get("email")),
    groupId: optional(formData.get("groupId")),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const result = await withAuth(eventId, "editor", async () => {
    await assertBelowLimit(eventId);
    await db.insert(guests).values({
      eventId,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      groupId: parsed.data.groupId || null,
    });
  });

  // Guest add doesn't affect sidebar data (couple name / theme / publish
  // state), so we scope to the guests route only. Was previously also
  // revalidating the dashboard layout — that wiped the full subtree
  // cache and forced every subsequent nav to cold-fetch.
  if (result.ok) {
    revalidatePath("/dashboard/guests");
  }
  return result;
}

export async function updateGuestAction(
  eventId: string,
  guestId: string,
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = guestInputSchema.safeParse({
    name: formData.get("name"),
    phone: optional(formData.get("phone")),
    email: optional(formData.get("email")),
    groupId: optional(formData.get("groupId")),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const result = await withAuth(eventId, "editor", async () => {
    await db
      .update(guests)
      .set({
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        groupId: parsed.data.groupId || null,
        updatedAt: new Date(),
      })
      .where(and(eq(guests.id, guestId), eq(guests.eventId, eventId)));
  });

  if (result.ok) revalidatePath("/dashboard/guests");
  return result;
}

export async function softDeleteGuestAction(
  eventId: string,
  guestId: string,
): Promise<ActionResult> {
  const result = await withAuth(eventId, "editor", async () => {
    await db
      .update(guests)
      .set({ deletedAt: new Date() })
      .where(and(eq(guests.id, guestId), eq(guests.eventId, eventId)));
  });
  if (result.ok) revalidatePath("/dashboard/guests");
  return result;
}

export async function restoreGuestAction(
  eventId: string,
  guestId: string,
): Promise<ActionResult> {
  const result = await withAuth(eventId, "editor", async () => {
    await db
      .update(guests)
      .set({ deletedAt: null })
      .where(and(eq(guests.id, guestId), eq(guests.eventId, eventId)));
  });
  if (result.ok) revalidatePath("/dashboard/guests");
  return result;
}

export async function createGuestGroupAction(
  eventId: string,
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = guestGroupInputSchema.safeParse({
    name: formData.get("name"),
    color: optional(formData.get("color")),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const result = await withAuth(eventId, "editor", async () => {
    try {
      await db.insert(guestGroups).values({
        eventId,
        name: parsed.data.name,
        color: parsed.data.color || null,
      });
    } catch (err) {
      const pgErr = err as { code?: string };
      if (pgErr.code === "23505") {
        throw new Error("Grup dengan nama yang sama sudah ada.");
      }
      throw err;
    }
  });

  if (result.ok) revalidatePath("/dashboard/guests");
  return result;
}

export async function deleteGuestGroupAction(
  eventId: string,
  groupId: string,
): Promise<ActionResult> {
  const result = await withAuth(eventId, "editor", async () => {
    await db
      .delete(guestGroups)
      .where(and(eq(guestGroups.id, groupId), eq(guestGroups.eventId, eventId)));
  });
  if (result.ok) revalidatePath("/dashboard/guests");
  return result;
}
