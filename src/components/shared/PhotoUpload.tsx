"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { requestPhotoUploadAction, type UploadSlot } from "@/lib/actions/upload";

const MAX_MB = 5;

export function PhotoUpload({
  eventId,
  slot,
  value,
  onChange,
  label,
  aspect = "square",
}: {
  eventId: string;
  slot: UploadSlot;
  value: string;
  onChange: (url: string) => void;
  label: string;
  aspect?: "square" | "wide";
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Harus berupa file gambar.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Ukuran foto maksimal ${MAX_MB} MB.`);
      return;
    }
    setUploading(true);
    try {
      const slot_ = slot;
      const prep = await requestPhotoUploadAction(
        eventId,
        slot_,
        file.type,
        file.size,
      );
      if (!prep.ok) {
        setError(prep.error);
        return;
      }
      const { bucket, path, token, publicUrl } = prep.data!;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (upErr) {
        setError(`Upload gagal: ${upErr.message}`);
        return;
      }
      onChange(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload gagal.");
    } finally {
      setUploading(false);
    }
  }

  const hasImage = Boolean(value);

  return (
    <div>
      <span className="text-sm font-medium text-ink">{label}</span>
      <div
        className={`mt-1 flex items-center gap-4 rounded-lg border border-dashed border-[color:var(--border-medium)] bg-white p-3 ${
          aspect === "wide" ? "flex-col md:flex-row" : ""
        }`}
      >
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-muted ${
            aspect === "wide" ? "h-24 w-full md:w-36" : "h-20 w-20"
          }`}
        >
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt={label}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-2xl text-ink-hint">♡</span>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-full border border-[color:var(--border-medium)] px-4 py-1.5 text-xs font-medium text-navy transition-colors hover:bg-surface-muted disabled:opacity-60"
            >
              {uploading ? "Mengunggah..." : hasImage ? "Ganti Foto" : "Unggah Foto"}
            </button>
            {hasImage && (
              <button
                type="button"
                onClick={() => onChange("")}
                disabled={uploading}
                className="rounded-full px-4 py-1.5 text-xs font-medium text-ink-muted hover:text-rose"
              >
                Hapus
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Atau tempel URL gambar"
            className="w-full rounded-md border border-[color:var(--border-ghost)] bg-white px-3 py-1.5 text-[11px] font-mono outline-none focus:border-navy"
          />
          <p className="text-[11px] text-ink-hint">
            JPG/PNG/WebP • max {MAX_MB} MB
          </p>
          {error && <p className="text-xs text-rose-dark">{error}</p>}
        </div>
      </div>
    </div>
  );
}
