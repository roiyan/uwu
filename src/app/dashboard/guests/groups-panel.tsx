"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  createGuestGroupAction,
  deleteGuestGroupAction,
} from "@/lib/actions/guest";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { GuestGroupRow } from "./client";

const inputClass =
  "mt-1 w-full rounded-lg border border-[color:var(--border-medium)] bg-white px-4 py-2.5 text-sm outline-none focus:border-navy focus:shadow-[var(--focus-ring-navy)]";

const COLOR_PRESETS = [
  "#F0CDD4",
  "#C5D4E8",
  "#E0BB92",
  "#F2EDE7",
  "#D4A574",
  "#8B9DC3",
];

export function GroupsPanel({
  open,
  eventId,
  groups,
  onClose,
}: {
  open: boolean;
  eventId: string;
  groups: GuestGroupRow[];
  onClose: () => void;
}) {
  const create = createGuestGroupAction.bind(null, eventId);
  const [state, action, pending] = useActionState(create, null);
  const [color, setColor] = useState<string>(COLOR_PRESETS[0]);
  const [deleteTarget, setDeleteTarget] = useState<GuestGroupRow | null>(null);
  const [deletePending, startDelete] = useTransition();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        className="absolute inset-0 bg-[color:var(--overlay-modal)]"
        onClick={pending ? undefined : onClose}
      />
      <div className="relative w-full max-w-lg rounded-2xl bg-surface-card p-6 shadow-ghost-lg">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl text-ink">Grup Tamu</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Kelompokkan tamu untuk broadcast yang lebih terarah.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-hint hover:text-ink"
          >
            ✕
          </button>
        </div>

        <form action={action} className="mt-5 space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-ink">Nama grup</span>
            <input
              name="name"
              required
              placeholder="Keluarga Mempelai Wanita"
              className={inputClass}
            />
          </label>
          <div>
            <span className="text-sm font-medium text-ink">Warna label</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full border transition-transform ${
                    color === c ? "scale-110 border-navy" : "border-transparent"
                  }`}
                  style={{ background: c }}
                  aria-label={`Pilih warna ${c}`}
                />
              ))}
            </div>
            <input type="hidden" name="color" value={color} />
          </div>

          {state && !state.ok && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-dark">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-coral px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-coral-dark disabled:opacity-60"
          >
            {pending ? "Menyimpan..." : "+ Tambah Grup"}
          </button>
        </form>

        <hr className="my-5 border-[color:var(--border-ghost)]" />

        <h3 className="text-sm font-medium text-ink">Grup saat ini</h3>
        {groups.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">Belum ada grup.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {groups.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2"
              >
                <span className="flex items-center gap-2 text-sm">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: g.color ?? "var(--color-gold-50)" }}
                  />
                  {g.name}
                </span>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(g)}
                  className="text-xs font-medium text-ink-muted hover:text-rose"
                >
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus grup?"
        description={
          deleteTarget
            ? `Grup ${deleteTarget.name} akan dihapus. Tamu di grup ini tidak ikut terhapus.`
            : undefined
        }
        loading={deletePending}
        onConfirm={() => {
          if (!deleteTarget) return;
          const target = deleteTarget;
          startDelete(async () => {
            await deleteGuestGroupAction(eventId, target.id);
            setDeleteTarget(null);
          });
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
