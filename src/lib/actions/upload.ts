"use server";

import { withAuth, type ActionResult } from "@/lib/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "event-media";
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

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

export type UploadSlot =
  | "bride-photo"
  | "groom-photo"
  | "cover-photo"
  | "gallery";

export async function requestPhotoUploadAction(
  eventId: string,
  slot: UploadSlot,
  contentType: string,
  sizeBytes: number,
): Promise<
  ActionResult<{
    bucket: string;
    path: string;
    token: string;
    publicUrl: string;
  }>
> {
  if (!ALLOWED_TYPES.has(contentType)) {
    return {
      ok: false,
      error: "Format tidak didukung. Gunakan JPG, PNG, atau WebP.",
    };
  }
  if (sizeBytes > MAX_SIZE_BYTES) {
    return { ok: false, error: "Ukuran foto maksimal 5 MB." };
  }

  return withAuth(eventId, "editor", async () => {
    const admin = createAdminClient();
    // Ensure bucket exists (idempotent)
    const { data: buckets } = await admin.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === BUCKET);
    if (!exists) {
      await admin.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: MAX_SIZE_BYTES,
        allowedMimeTypes: Array.from(ALLOWED_TYPES),
      });
    }

    const ext = extensionFor(contentType);
    const path = `events/${eventId}/${slot}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error || !data) {
      throw new Error(error?.message ?? "Gagal menyiapkan upload.");
    }

    const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data
      .publicUrl;

    return {
      bucket: BUCKET,
      path,
      token: data.token,
      publicUrl,
    };
  });
}
