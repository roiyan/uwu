"use client";

import { useState } from "react";
import { MediaLibraryModal } from "./MediaLibraryModal";

/**
 * Reusable photo-picker tile that opens the MediaLibraryModal in
 * picker mode. Drop-in replacement for the current PhotoUpload box in
 * the section editors (mempelai, cover, etc.) — same `value` (URL) +
 * `onChange` API, but instead of triggering a one-off upload it lets
 * the operator reuse anything already in the library.
 *
 * Visual: the tile renders the current image when present (small
 * thumbnail) and a dashed "Pilih dari perpustakaan" prompt when
 * empty. Clicking anywhere on the tile opens the modal.
 *
 * `eventId` is required because the underlying modal calls
 * listMediaAction(eventId) which is gated by withAuth on the server.
 */
export function MediaPicker({
  eventId,
  value,
  onChange,
  label,
  helper,
  aspectRatio,
}: {
  eventId: string;
  value: string | null;
  onChange: (url: string | null) => void;
  /** Section-relative label rendered above the tile (e.g. "Foto Mempelai Wanita"). */
  label?: string;
  /** Subtle one-line hint, mono font. */
  helper?: string;
  /** CSS aspect-ratio string, defaults to portrait 3/4 to match the
   *  invitation's couple/cover photos. Pass "16/9" for hero-shaped
   *  slots, "1/1" for square thumbnails, etc. */
  aspectRatio?: string;
}) {
  const [open, setOpen] = useState(false);
  const ratio = aspectRatio ?? "3 / 4";

  return (
    <div>
      {label && (
        <p className="d-mono mb-2 block text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
          {label}
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative w-full overflow-hidden rounded-[14px] border border-dashed border-[var(--d-line-strong)] bg-[rgba(255,255,255,0.02)] transition-colors hover:border-[var(--d-coral)] hover:bg-[rgba(240,160,156,0.04)]"
        style={{ aspectRatio: ratio }}
        aria-label={
          value ? "Ganti foto dari perpustakaan" : "Pilih foto dari perpustakaan"
        }
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="d-mono pointer-events-auto rounded-full bg-black/60 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white">
                Ganti
              </span>
              {/* The clear button intercepts the click so the tile
                  doesn't open the modal at the same time. */}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange(null);
                  }
                }}
                className="d-mono pointer-events-auto cursor-pointer rounded-full border border-white/40 bg-black/50 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white transition-colors hover:border-[var(--d-coral)] hover:text-[var(--d-coral)]"
              >
                Hapus
              </span>
            </div>
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-[var(--d-ink-dim)]">
            <span aria-hidden className="text-[24px]">
              ↑
            </span>
            <p className="d-serif text-[14px] italic">
              Pilih dari perpustakaan
            </p>
            {helper && (
              <p className="d-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
                {helper}
              </p>
            )}
          </div>
        )}
      </button>

      <MediaLibraryModal
        eventId={eventId}
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(url) => {
          onChange(url);
          setOpen(false);
        }}
      />
    </div>
  );
}
