"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  deleteMediaAction,
  listMediaAction,
  uploadMediaAction,
  type MediaRow,
} from "@/lib/actions/media";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/Toast";

/**
 * Full-screen "Perpustakaan Media" dialog mounted from the Website
 * Editor header. Two roles in one component:
 *
 *   1. **Picker** — when the parent passes `onSelect`, clicking a tile
 *      returns the file URL and closes the modal. Used by MediaPicker.
 *   2. **Manager** — when `onSelect` is omitted, tiles are read-only
 *      and the only action is delete. Used by the camera icon in
 *      EditorSplit's top bar.
 *
 * Initial library load is deferred to the open transition — there's
 * no point fetching when the operator hasn't opened the panel yet.
 */
export function MediaLibraryModal({
  eventId,
  open,
  onClose,
  onSelect,
}: {
  eventId: string;
  open: boolean;
  onClose: () => void;
  onSelect?: (url: string, mediaId: string) => void;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<MediaRow | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  // Lazy-load on open. Refresh after each upload/delete so the grid
  // matches server state without polling.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    listMediaAction(eventId).then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) setItems(res.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, eventId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !uploading && !deletePending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, uploading, deletePending, onClose]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      // Upload one at a time — the server enforces 5MB / image-only,
      // and queueing keeps the UX simple (operator sees each tile
      // appear instead of an opaque batch progress).
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.set("file", file);
        const res = await uploadMediaAction(eventId, fd);
        if (res.ok && res.data) {
          setItems((cur) => [res.data!, ...cur]);
        } else if (!res.ok) {
          toast.error(res.error);
        }
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeletePending(true);
    startTransition(async () => {
      const res = await deleteMediaAction(eventId, target.id);
      setDeletePending(false);
      if (res.ok) {
        setItems((cur) => cur.filter((m) => m.id !== target.id));
        setDeleteTarget(null);
        toast.success("Foto dihapus dari perpustakaan.");
      } else {
        toast.error(res.error);
      }
    });
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Perpustakaan Media"
      className="theme-dashboard fixed inset-0 z-50 flex items-stretch justify-center"
    >
      <button
        type="button"
        aria-label="Tutup"
        onClick={uploading || deletePending ? undefined : onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
      />

      <div className="relative m-4 flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[var(--d-line-strong)] bg-[var(--d-bg-1)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--d-line)] px-7 py-5">
          <div className="min-w-0">
            <p className="d-mono text-[10px] uppercase tracking-[0.32em] text-[var(--d-coral)]">
              Perpustakaan Media
            </p>
            <h2 className="d-serif mt-1 text-[22px] font-extralight text-[var(--d-ink)]">
              Foto sekali unggah,{" "}
              <em className="d-serif italic text-[var(--d-coral)]">
                pakai di mana saja
              </em>
              .
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="d-mono inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-5 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? "Mengunggah…" : "+ Unggah Foto"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={uploading || deletePending}
              className="d-mono rounded-full border border-[var(--d-line-strong)] px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)] transition-colors hover:border-[var(--d-coral)] hover:text-[var(--d-coral)] disabled:opacity-40"
            >
              Tutup
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
          {loading ? (
            <p className="d-serif text-center text-[14px] italic text-[var(--d-ink-dim)]">
              Memuat perpustakaan…
            </p>
          ) : items.length === 0 ? (
            <EmptyState
              onUpload={() => fileRef.current?.click()}
              hasPicker={Boolean(onSelect)}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {items.map((m) => (
                <MediaTile
                  key={m.id}
                  media={m}
                  pickable={Boolean(onSelect)}
                  onPick={() => onSelect?.(m.fileUrl, m.id)}
                  onDelete={() => setDeleteTarget(m)}
                />
              ))}
            </div>
          )}
        </div>

        <footer className="border-t border-[var(--d-line)] px-7 py-3">
          <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
            JPG · PNG · WebP · maksimal 5 MB · disimpan di bucket
            event-media
          </p>
        </footer>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={
          deleteTarget?.fileName
            ? `Hapus ${deleteTarget.fileName}?`
            : "Hapus foto ini?"
        }
        description="Foto akan dihapus permanen dari perpustakaan dan dari penyimpanan. Pastikan tidak sedang dipakai di section lain."
        loading={deletePending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel="Hapus"
      />
    </div>
  );
}

function MediaTile({
  media,
  pickable,
  onPick,
  onDelete,
}: {
  media: MediaRow;
  pickable: boolean;
  onPick: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-[14px] border border-[var(--d-line)] bg-[var(--d-bg-2)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={media.fileUrl}
        alt={media.fileName ?? ""}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="pointer-events-auto flex flex-1 flex-wrap items-center gap-2">
          {pickable && (
            <button
              type="button"
              onClick={onPick}
              className="d-mono rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-white"
            >
              ✓ Pilih
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Hapus foto"
          className="pointer-events-auto rounded-full border border-white/30 bg-black/50 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white transition-colors hover:border-[var(--d-coral)] hover:text-[var(--d-coral)]"
        >
          Hapus
        </button>
      </div>
    </div>
  );
}

function EmptyState({
  onUpload,
  hasPicker,
}: {
  onUpload: () => void;
  hasPicker: boolean;
}) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-[var(--d-line-strong)] bg-[rgba(255,255,255,0.02)] p-10 text-center">
      <p className="d-mono text-[10px] uppercase tracking-[0.32em] text-[var(--d-coral)]">
        Belum ada foto
      </p>
      <h3 className="d-serif mt-3 text-[20px] font-extralight text-[var(--d-ink)]">
        Mulai unggah{" "}
        <em className="d-serif italic text-[var(--d-coral)]">koleksi</em>{" "}
        kalian.
      </h3>
      <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--d-ink-dim)]">
        {hasPicker
          ? "Foto yang Anda unggah akan langsung tersedia untuk dipilih di section editor."
          : "Foto yang Anda unggah akan tersedia untuk semua section editor — sekali upload, pakai berkali-kali."}
      </p>
      <button
        type="button"
        onClick={onUpload}
        className="d-mono mt-6 inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90"
      >
        + Unggah Foto Pertama
      </button>
    </div>
  );
}
