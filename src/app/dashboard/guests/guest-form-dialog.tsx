"use client";

import { useActionState, useEffect } from "react";
import { createGuestAction, updateGuestAction } from "@/lib/actions/guest";
import type { GuestGroupRow, GuestRow } from "./client";

// Underline-only inputs to match the dashboard dark idiom — same
// look as the broadcast composer's chip editor.
const inputClass =
  "mt-2 w-full bg-transparent border-0 border-b border-[var(--d-line-strong)] px-0 py-2.5 text-[14px] text-[var(--d-ink)] outline-none placeholder:text-[var(--d-ink-faint)] focus:border-[var(--d-coral)] transition-colors";

const labelClass =
  "d-mono block text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]";

export function GuestFormDialog({
  open,
  eventId,
  groups,
  editing,
  presetGroupId,
  onClose,
}: {
  open: boolean;
  eventId: string;
  groups: GuestGroupRow[];
  editing: GuestRow | null;
  // When set (and `editing` is null), pre-selects this group in the
  // "Grup" dropdown — used by the per-group "+ Tambah" button on the
  // grouped guest list.
  presetGroupId?: string | null;
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
    <div
      role="dialog"
      aria-modal="true"
      className="theme-dashboard fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={pending ? undefined : onClose}
      />
      <form
        action={formAction}
        className="relative w-full max-w-lg rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-7 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          aria-label="Tutup"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--d-line-strong)] text-[var(--d-ink-dim)] transition-colors hover:bg-[var(--d-bg-2)] hover:text-[var(--d-ink)] disabled:opacity-40"
        >
          ✕
        </button>
        <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-coral)]">
          Tamu
        </p>
        <h2 className="d-serif mt-2 text-[26px] font-extralight text-[var(--d-ink)]">
          {isEdit ? "Edit Tamu" : "Tambah Tamu"}
        </h2>
        <p className="mt-2 text-[13px] text-[var(--d-ink-dim)]">
          Nama dan nomor WhatsApp akan digunakan untuk mengirim undangan.
        </p>

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className={labelClass}>
              Nama <span className="text-[var(--d-coral)]">*</span>
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
            <span className={labelClass}>No. WhatsApp</span>
            <input
              name="phone"
              defaultValue={editing?.phone ?? ""}
              placeholder="+62 812 3456 7890"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Email</span>
            <input
              name="email"
              type="email"
              defaultValue={editing?.email ?? ""}
              placeholder="budi@email.com"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Grup</span>
            <select
              name="groupId"
              // `key` forces React to reset defaultValue when the
              // preset switches between group buttons — uncontrolled
              // <select> would otherwise stick to the first mount value.
              key={editing?.id ?? presetGroupId ?? "blank"}
              defaultValue={editing?.groupId ?? presetGroupId ?? ""}
              className={`${inputClass} bg-[var(--d-bg-2)]`}
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
          <p className="mt-5 rounded-md border border-[rgba(240,160,156,0.3)] bg-[rgba(240,160,156,0.08)] px-3 py-2 text-sm text-[var(--d-coral)]">
            {state.error}
          </p>
        )}

        <div className="mt-7 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="d-mono rounded-full border border-[var(--d-line-strong)] px-5 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)] transition-colors hover:bg-[var(--d-bg-2)] hover:text-[var(--d-ink)] disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={pending}
            className="d-mono inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Menyimpan…" : isEdit ? "Simpan" : "Tambah"}
          </button>
        </div>
      </form>
    </div>
  );
}
