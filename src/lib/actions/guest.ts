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

/**
 * Rename a guest group. FK relationships on guests.group_id are
 * preserved (guests keep pointing at the same row — just with a new
 * display name).
 */
export async function renameGuestGroupAction(
  eventId: string,
  groupId: string,
  newName: string,
): Promise<ActionResult> {
  const trimmed = newName.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: "Nama grup minimal 2 karakter." };
  }
  const result = await withAuth(eventId, "editor", async () => {
    try {
      await db
        .update(guestGroups)
        .set({ name: trimmed })
        .where(
          and(eq(guestGroups.id, groupId), eq(guestGroups.eventId, eventId)),
        );
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

/**
 * Reorder groups by passing the new ordered list of IDs. Rows not in
 * the list are left untouched.
 */
export async function reorderGuestGroupsAction(
  eventId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const result = await withAuth(eventId, "editor", async () => {
    await Promise.all(
      orderedIds.map((id, i) =>
        db
          .update(guestGroups)
          .set({ sortOrder: i })
          .where(and(eq(guestGroups.id, id), eq(guestGroups.eventId, eventId))),
      ),
    );
  });
  if (result.ok) revalidatePath("/dashboard/guests");
  return result;
}

export type ImportGuestPayload = {
  name: string;
  nickname: string | null;
  phone: string | null;
  email: string | null;
  plusCount: number;
  groupName: string | null;
  notes: string | null;
};

/**
 * Bulk-import guests from an Excel file. Auto-creates any referenced
 * group that doesn't exist yet (by name, case-insensitive match),
 * then inserts the guests in a single statement.
 *
 * Returns a count of how many guests were actually written and a list
 * of the new groups that were created so the UI can surface them.
 */
export async function importGuestsAction(
  eventId: string,
  payload: ImportGuestPayload[],
): Promise<
  ActionResult<{ imported: number; newGroups: string[]; skipped: number }>
> {
  if (!Array.isArray(payload) || payload.length === 0) {
    return { ok: false, error: "Tidak ada data untuk diimport." };
  }

  const result = await withAuth(eventId, "editor", async () => {
    // Package-limit check. Fail fast before doing any inserts.
    const { limit } = await getEventPackageLimit(eventId);
    const [existing] = await db
      .select({ total: count() })
      .from(guests)
      .where(and(eq(guests.eventId, eventId), isNull(guests.deletedAt)));
    const current = existing?.total ?? 0;
    if (current + payload.length > limit) {
      throw new Error(
        `Batas paket ${limit} tamu akan terlampaui. Saat ini ${current}, mencoba import ${payload.length}.`,
      );
    }

    // Ensure all referenced groups exist. Match case-insensitively.
    const existingGroups = await db
      .select()
      .from(guestGroups)
      .where(eq(guestGroups.eventId, eventId));
    const byLower = new Map(
      existingGroups.map((g) => [g.name.toLowerCase(), g]),
    );

    const referenced = [
      ...new Set(
        payload
          .map((p) => p.groupName?.trim())
          .filter((n): n is string => Boolean(n)),
      ),
    ];
    const newGroupNames = referenced.filter(
      (name) => !byLower.has(name.toLowerCase()),
    );

    if (newGroupNames.length > 0) {
      const baseOrder = existingGroups.length;
      const inserted = await db
        .insert(guestGroups)
        .values(
          newGroupNames.map((name, i) => ({
            eventId,
            name,
            sortOrder: baseOrder + i,
          })),
        )
        .onConflictDoNothing()
        .returning();
      for (const row of inserted) {
        byLower.set(row.name.toLowerCase(), row);
      }
    }

    // Build insert rows with resolved groupId.
    const rows = payload.map((p) => {
      const match = p.groupName
        ? byLower.get(p.groupName.trim().toLowerCase())
        : null;
      return {
        eventId,
        groupId: match?.id ?? null,
        name: p.name.trim(),
        nickname: p.nickname?.trim() || null,
        phone: p.phone || null,
        email: p.email?.trim() || null,
        plusCount: Math.min(Math.max(p.plusCount, 1), 10),
        notes: p.notes?.trim() || null,
      };
    });

    await db.insert(guests).values(rows);

    return {
      imported: rows.length,
      newGroups: newGroupNames,
      skipped: payload.length - rows.length,
    };
  });
  if (result.ok) revalidatePath("/dashboard/guests");
  return result;
}
