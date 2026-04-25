"use client";

import { useRef, useState } from "react";
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
      // Dynamic import keeps @supabase/supabase-js out of the editor's
      // initial bundle — only pulled in when the user actually uploads.
      const { createClient } = await import("@/lib/supabase/client");
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
      <span className="d-mono block text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
        {label}
      </span>
      <div
        className={`mt-2 flex items-center gap-4 rounded-[14px] border border-dashed border-[var(--d-line-strong)] bg-[var(--d-bg-2)] p-4 ${
          aspect === "wide" ? "flex-col md:flex-row" : ""
        }`}
      >
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[var(--d-line)] bg-[var(--d-bg-1)] ${
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
            <span className="text-2xl text-[var(--d-ink-faint)]">♡</span>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="d-mono inline-flex items-center gap-2 rounded-full border border-[var(--d-line-strong)] bg-[var(--d-bg-card)] px-4 py-1.5 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink)] transition-colors hover:bg-[var(--d-bg-1)] disabled:opacity-50"
            >
              {uploading
                ? "Mengunggah…"
                : hasImage
                  ? "Ganti Foto"
                  : "Unggah Foto"}
            </button>
            {hasImage && (
              <button
                type="button"
                onClick={() => onChange("")}
                disabled={uploading}
                className="d-mono rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)] transition-colors hover:text-[var(--d-coral)]"
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
            className="w-full bg-transparent border-0 border-b border-[var(--d-line)] px-0 py-1.5 text-[11.5px] text-[var(--d-ink)] outline-none placeholder:italic placeholder:text-[var(--d-ink-faint)] focus:border-[var(--d-coral)] transition-colors"
          />
          <p className="d-mono text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
            JPG/PNG/WebP · max {MAX_MB} MB
          </p>
          {error && (
            <p className="text-[12px] text-[var(--d-coral)]">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
