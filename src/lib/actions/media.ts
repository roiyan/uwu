"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventMedia } from "@/lib/db/schema";
import { withAuth, type ActionResult } from "@/lib/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Centralised media library — backs the "Perpustakaan Media" panel
 * in the Website Editor. The actions here intentionally mirror
 * `uploadGalleryImageAction` / `deleteGalleryImageAction` so the
 * upload pipeline (validation → admin Storage upload → row insert →
 * revalidate) is consistent across both surfaces. The same
 * `event-media` Supabase bucket is reused — we DO NOT create a new
 * `media` bucket. Files land under `events/<eventId>/library/<key>`
 * so the bucket's directory layout stays self-documenting.
 */

const BUCKET = "event-media";
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

function extensionFor(contentType: string): string {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

export type MediaRow = {
  id: string;
  fileUrl: string;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  uploadedAt: string;
};

export async function listMediaAction(
  eventId: string,
): Promise<ActionResult<MediaRow[]>> {
  return withAuth(eventId, "viewer", async () => {
    const rows = await db
      .select()
      .from(eventMedia)
      .where(eq(eventMedia.eventId, eventId))
      .orderBy(desc(eventMedia.uploadedAt));
    return rows.map((r) => ({
      id: r.id,
      fileUrl: r.fileUrl,
      fileName: r.fileName,
      fileSize: r.fileSize,
      mimeType: r.mimeType,
      width: r.width,
      height: r.height,
      uploadedAt: r.uploadedAt.toISOString(),
    }));
  });
}

export async function uploadMediaAction(
  eventId: string,
  formData: FormData,
): Promise<ActionResult<MediaRow>> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Tidak ada file yang diunggah." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return {
      ok: false,
      error: "Format harus JPG, PNG, atau WebP.",
    };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { ok: false, error: "Ukuran foto maksimal 5 MB." };
  }

  return withAuth(eventId, "editor", async () => {
    const admin = createAdminClient();
    const ext = extensionFor(file.type);
    const storagePath = `events/${eventId}/library/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const arrayBuf = await file.arrayBuffer();
    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, arrayBuf, {
        contentType: file.type,
        upsert: false,
      });
    if (uploadErr) {
      throw new Error(`Upload gagal: ${uploadErr.message}`);
    }

    const fileUrl = admin.storage.from(BUCKET).getPublicUrl(storagePath).data
      .publicUrl;

    const [row] = await db
      .insert(eventMedia)
      .values({
        eventId,
        fileUrl,
        storagePath,
        fileName: file.name || null,
        fileSize: file.size,
        mimeType: file.type,
      })
      .returning();

    revalidatePath("/dashboard/website");
    return {
      id: row.id,
      fileUrl: row.fileUrl,
      fileName: row.fileName,
      fileSize: row.fileSize,
      mimeType: row.mimeType,
      width: row.width,
      height: row.height,
      uploadedAt: row.uploadedAt.toISOString(),
    };
  });
}

export async function deleteMediaAction(
  eventId: string,
  mediaId: string,
): Promise<ActionResult> {
  return withAuth(eventId, "editor", async () => {
    const [row] = await db
      .select()
      .from(eventMedia)
      .where(
        and(eq(eventMedia.id, mediaId), eq(eventMedia.eventId, eventId)),
      )
      .limit(1);
    if (!row) throw new Error("Foto tidak ditemukan.");

    // Best-effort storage cleanup. We don't fail the DB delete if the
    // storage object is already gone — the row deletion is the source
    // of truth for the library grid.
    if (row.storagePath) {
      const admin = createAdminClient();
      await admin.storage
        .from(BUCKET)
        .remove([row.storagePath])
        .catch(() => undefined);
    }
    await db.delete(eventMedia).where(eq(eventMedia.id, mediaId));
    revalidatePath("/dashboard/website");
  });
}
