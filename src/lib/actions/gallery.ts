"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventGallery } from "@/lib/db/schema";
import { withAuth, type ActionResult } from "@/lib/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "event-media";
const MAX_PHOTOS = 6;
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

function extensionFor(contentType: string): string {
  switch (contentType) {
    case "image/png": return "png";
    case "image/webp": return "webp";
    default: return "jpg";
  }
}

export type GalleryImageRow = {
  id: string;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
};

export async function listGalleryImagesAction(
  eventId: string,
): Promise<ActionResult<GalleryImageRow[]>> {
  return withAuth(eventId, "viewer", async () => {
    const rows = await db
      .select()
      .from(eventGallery)
      .where(eq(eventGallery.eventId, eventId))
      .orderBy(asc(eventGallery.sortOrder), asc(eventGallery.createdAt));
    return rows.map((r) => ({
      id: r.id,
      imageUrl: r.imageUrl,
      caption: r.caption,
      sortOrder: r.sortOrder ?? 0,
    }));
  });
}

export async function listPublicGalleryImages(
  eventId: string,
): Promise<GalleryImageRow[]> {
  const rows = await db
    .select()
    .from(eventGallery)
    .where(eq(eventGallery.eventId, eventId))
    .orderBy(asc(eventGallery.sortOrder), asc(eventGallery.createdAt));
  return rows.map((r) => ({
    id: r.id,
    imageUrl: r.imageUrl,
    caption: r.caption,
    sortOrder: r.sortOrder ?? 0,
  }));
}

export async function uploadGalleryImageAction(
  eventId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string; imageUrl: string }>> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Tidak ada file yang diunggah." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: "Format harus JPG, PNG, atau WebP." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { ok: false, error: "Ukuran foto maksimal 5 MB." };
  }

  return withAuth(eventId, "editor", async () => {
    const existing = await db
      .select()
      .from(eventGallery)
      .where(eq(eventGallery.eventId, eventId));
    if (existing.length >= MAX_PHOTOS) {
      throw new Error(`Maksimal ${MAX_PHOTOS} foto.`);
    }

    const admin = createAdminClient();
    const ext = extensionFor(file.type);
    const path = `events/${eventId}/gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const arrayBuf = await file.arrayBuffer();
    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(path, arrayBuf, { contentType: file.type, upsert: false });
    if (uploadErr) throw new Error(`Upload gagal: ${uploadErr.message}`);

    const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    const [row] = await db
      .insert(eventGallery)
      .values({ eventId, imageUrl: publicUrl, sortOrder: existing.length })
      .returning({ id: eventGallery.id });

    revalidatePath("/dashboard/website");
    return { id: row.id, imageUrl: publicUrl };
  });
}

export async function deleteGalleryImageAction(
  eventId: string,
  imageId: string,
): Promise<ActionResult> {
  return withAuth(eventId, "editor", async () => {
    const [row] = await db
      .select()
      .from(eventGallery)
      .where(and(eq(eventGallery.id, imageId), eq(eventGallery.eventId, eventId)))
      .limit(1);
    if (!row) throw new Error("Foto tidak ditemukan.");

    const marker = `/${BUCKET}/`;
    const idx = row.imageUrl.indexOf(marker);
    if (idx >= 0) {
      const path = row.imageUrl.slice(idx + marker.length);
      const admin = createAdminClient();
      await admin.storage.from(BUCKET).remove([path]);
    }
    await db.delete(eventGallery).where(eq(eventGallery.id, imageId));
    revalidatePath("/dashboard/website");
  });
}
