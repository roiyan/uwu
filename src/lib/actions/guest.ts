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

/**
 * Reassign a single guest to a different group (or to "Tanpa Grup" by
 * passing `null`). Used by the drag-and-drop affordance on the Tamu
 * page so the operator doesn't have to open the edit dialog just to
 * move someone between sections. Validates that the target group, when
 * given, belongs to the same event — preventing cross-event leaks
 * even though the UI never exposes other events.
 */
export async function moveGuestToGroupAction(
  eventId: string,
  guestId: string,
  newGroupId: string | null,
): Promise<ActionResult> {
  const result = await withAuth(eventId, "editor", async () => {
    if (newGroupId) {
      const [grp] = await db
        .select({ id: guestGroups.id })
        .from(guestGroups)
        .where(
          and(
            eq(guestGroups.id, newGroupId),
            eq(guestGroups.eventId, eventId),
          ),
        )
        .limit(1);
      if (!grp) throw new Error("Grup tujuan tidak ditemukan.");
    }
    await db
      .update(guests)
      .set({ groupId: newGroupId, updatedAt: new Date() })
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
 * display name). Kept as a thin wrapper around updateGuestGroupAction
 * for existing callers.
 */
export async function renameGuestGroupAction(
  eventId: string,
  groupId: string,
  newName: string,
): Promise<ActionResult> {
  return updateGuestGroupAction(eventId, groupId, { name: newName });
}

/**
 * Update a guest group's name and/or color. Pass only the fields you
 * want to change.
 */
export async function updateGuestGroupAction(
  eventId: string,
  groupId: string,
  updates: { name?: string; color?: string | null },
): Promise<ActionResult> {
  const patch: { name?: string; color?: string | null } = {};

  if (updates.name !== undefined) {
    const trimmed = updates.name.trim();
    if (trimmed.length < 2) {
      return { ok: false, error: "Nama grup minimal 2 karakter." };
    }
    patch.name = trimmed;
  }

  if (updates.color !== undefined) {
    // Accept either null (to clear) or a #rrggbb hex string.
    if (updates.color !== null) {
      const normalized = updates.color.trim();
      if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) {
        return { ok: false, error: "Kode warna tidak valid." };
      }
      patch.color = normalized;
    } else {
      patch.color = null;
    }
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "Tidak ada perubahan." };
  }

  const result = await withAuth(eventId, "editor", async () => {
    try {
      await db
        .update(guestGroups)
        .set(patch)
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

    // Build insert rows. Every row gets `groupId = UUID | null` —
    // never a string name. Guard explicitly in case the map somehow
    // doesn't resolve, so we don't pass a bare string to a UUID col.
    const rows = payload.map((p) => {
      let groupId: string | null = null;
      const rawGroup = p.groupName?.trim();
      if (rawGroup) {
        const match = byLower.get(rawGroup.toLowerCase());
        if (match && typeof match.id === "string") {
          groupId = match.id;
        }
      }
      const plusCount = Number.isFinite(Number(p.plusCount))
        ? Math.min(Math.max(Math.round(Number(p.plusCount)), 1), 10)
        : 1;
      return {
        eventId,
        groupId,
        name: p.name.trim(),
        nickname: p.nickname?.trim() || null,
        phone: p.phone || null,
        email: p.email?.trim() || null,
        plusCount,
        notes: p.notes?.trim() || null,
      };
    });

    try {
      await db.insert(guests).values(rows);
    } catch (err) {
      // Drizzle wraps postgres-js errors, so `err.code` is usually
      // undefined — the real code lives on `err.cause`. Walk the
      // chain and also fall back to message-substring matching so we
      // surface a useful toast instead of raw "Failed query: ...".
      const code = extractPgCode(err);
      const pgMessage = extractPgMessage(err);
      console.error("[importGuestsAction] insert failed", {
        code,
        pgMessage,
        top: err instanceof Error ? err.message : String(err),
        sample: rows.slice(0, 2),
      });

      const msg = (pgMessage ?? "").toLowerCase();

      if (
        code === "42703" ||
        msg.includes("does not exist") ||
        msg.includes("column") ||
        msg.includes("undefined column")
      ) {
        throw new Error(
          "Kolom database belum lengkap. Jalankan migrasi terbaru (pnpm db:migrate) lalu coba lagi.",
        );
      }
      if (code === "42P01" || msg.includes("relation") && msg.includes("does not exist")) {
        throw new Error(
          "Tabel guests tidak ditemukan. Jalankan migrasi database.",
        );
      }
      if (code === "23503" || msg.includes("foreign key")) {
        throw new Error(
          "Foreign key tidak valid (event atau grup tidak ditemukan).",
        );
      }
      if (code === "23505" || msg.includes("duplicate key")) {
        throw new Error("Terdapat tamu duplikat. Periksa file Anda.");
      }
      if (code === "23502" || msg.includes("not-null") || msg.includes("null value")) {
        throw new Error(
          "Data wajib tidak lengkap — pastikan kolom Nama tidak kosong.",
        );
      }
      if (code === "22P02" || msg.includes("invalid input syntax")) {
        throw new Error(
          "Format data tidak valid (cek Jumlah Undangan harus angka).",
        );
      }
      // Unknown — include code + short message so the toast is useful
      // without dumping the whole SQL query.
      const short = pgMessage ? pgMessage.split("\n")[0].slice(0, 160) : "";
      throw new Error(
        `Gagal menyimpan tamu${code ? ` [${code}]` : ""}${short ? `: ${short}` : "."}`,
      );
    }

    return {
      imported: rows.length,
      newGroups: newGroupNames,
      skipped: payload.length - rows.length,
    };
  });
  if (result.ok) revalidatePath("/dashboard/guests");
  return result;
}

/**
 * Walk the error cause chain looking for a Postgres error code.
 * Drizzle wraps postgres-js errors, so `err.code` on the outer object
 * is usually undefined — the real code lives on `err.cause`, which
 * may itself be wrapped.
 */
function extractPgCode(err: unknown): string | undefined {
  let cur: unknown = err;
  for (let i = 0; i < 4 && cur; i++) {
    const obj = cur as { code?: string; cause?: unknown };
    if (typeof obj.code === "string" && /^[0-9A-Z]{5}$/.test(obj.code)) {
      return obj.code;
    }
    cur = obj.cause;
  }
  return undefined;
}

function extractPgMessage(err: unknown): string | undefined {
  let cur: unknown = err;
  const msgs: string[] = [];
  for (let i = 0; i < 4 && cur; i++) {
    const obj = cur as { message?: string; cause?: unknown };
    if (typeof obj.message === "string") msgs.push(obj.message);
    cur = obj.cause;
  }
  // Prefer the deepest message since that's usually the raw PG one.
  return msgs.length > 0 ? msgs[msgs.length - 1] : undefined;
}
