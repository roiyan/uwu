"use client";

import { useActionState, useEffect } from "react";
import { createGuestAction, updateGuestAction } from "@/lib/actions/guest";
import type { GuestGroupRow, GuestRow } from "./client";

const inputClass =
  "mt-1 w-full rounded-lg border border-[color:var(--border-medium)] bg-white px-4 py-2.5 text-sm outline-none focus:border-navy focus:shadow-[var(--focus-ring-navy)]";

export function GuestFormDialog({
  open,
  eventId,
  groups,
  editing,
  onClose,
}: {
  open: boolean;
  eventId: string;
  groups: GuestGroupRow[];
  editing: GuestRow | null;
  onClose: () => void;
}) {
  const create = createGuestAction.bind(null, eventId);
  const update = editing
    ? updateGuestAction.bind(null, eventId, editing.id)
    : null;
  const [createState, createAction, createPending] = useActionState(create, null);
  const [updateState, updateAction, updatePending] = useActionState(
    update ?? create,
    null,
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (createState?.ok || updateState?.ok) onClose();
    // onClose stable via parent setter

  }, [createState, updateState, onClose]);

  if (!open) return null;

  const isEdit = editing !== null;
  const formAction = isEdit ? updateAction : createAction;
  const pending = isEdit ? updatePending : createPending;
  const state = isEdit ? updateState : createState;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[color:var(--overlay-modal)]" onClick={pending ? undefined : onClose} />
      <form
        action={formAction}
        className="relative w-full max-w-lg rounded-2xl bg-surface-card p-6 shadow-ghost-lg"
      >
        <h2 className="font-display text-xl text-ink">
          {isEdit ? "Edit Tamu" : "Tambah Tamu"}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Nama dan nomor WhatsApp akan digunakan untuk mengirim undangan.
        </p>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-ink">
              Nama <span className="text-rose">*</span>
            </span>
            <input
              name="name"
              required
              defaultValue={editing?.name}
              placeholder="Bapak Budi Santoso"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">No. WhatsApp</span>
            <input
              name="phone"
              defaultValue={editing?.phone ?? ""}
              placeholder="+62 812 3456 7890"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Email</span>
            <input
              name="email"
              type="email"
              defaultValue={editing?.email ?? ""}
              placeholder="budi@email.com"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Grup</span>
            <select
              name="groupId"
              defaultValue={editing?.groupId ?? ""}
              className={inputClass}
            >
              <option value="">Tanpa grup</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {state && !state.ok && (
          <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-dark">
            {state.error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-full border border-[color:var(--border-medium)] px-5 py-2 text-sm font-medium text-navy transition-colors hover:bg-surface-muted disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-coral px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-coral-dark disabled:opacity-60"
          >
            {pending ? "Menyimpan..." : isEdit ? "Simpan" : "Tambah"}
          </button>
        </div>
      </form>
    </div>
  );
}
