"use client";

import { useState, type FormEvent } from "react";
import type { WalkInPayload } from "@/lib/actions/checkin";

const inputClass =
  "mt-2 w-full bg-transparent border-0 border-b border-[var(--d-line-strong)] px-0 py-2.5 text-[14px] text-[var(--d-ink)] outline-none placeholder:text-[var(--d-ink-faint)] focus:border-[var(--d-coral)] transition-colors";

const labelClass =
  "d-mono block text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]";

/**
 * Walk-in entry form for guests not on the original list. Used by
 * both the operator dashboard and the public station — the parent
 * decides which `onSubmit` (authenticated `checkinWalkInAction` or
 * public `checkinWalkInPublic`) to wire up. The form itself is
 * channel-agnostic.
 *
 * Submitting the form does two things in one round-trip on the
 * server: (1) inserts a brand-new guest row, (2) marks them as
 * checked in. The package limit is enforced server-side so a paused
 * UI here would only delay an inevitable error — we let the action
 * decide and surface its message.
 */
export function WalkinForm({
  groups,
  defaultOperator = "",
  onSubmit,
  busy = false,
  error = null,
  onCancel,
}: {
  groups: { id: string; name: string }[];
  defaultOperator?: string;
  onSubmit: (payload: WalkInPayload) => Promise<void>;
  busy?: boolean;
  error?: string | null;
  onCancel?: () => void;
}) {
  // Local controlled inputs — kept in state so the parent can clear
  // by remounting (key change) or we can present a clean form after
  // a successful submit (handled by the parent calling onCancel).
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [groupId, setGroupId] = useState<string>("");
  const [actualPax, setActualPax] = useState("1");
  const [notes, setNotes] = useState("");
  const [operator, setOperator] = useState(defaultOperator);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);

    const pax = Number.parseInt(actualPax, 10);
    if (!Number.isFinite(pax) || pax < 1) {
      setLocalError("Jumlah pax minimal 1.");
      return;
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      setLocalError("Nama wajib diisi.");
      return;
    }

    const payload: WalkInPayload = {
      name: trimmedName,
      phone: phone.trim() || undefined,
      groupId: groupId || null,
      actualPax: pax,
      checkinNotes: notes.trim() || undefined,
      checkedInBy: operator.trim() || undefined,
    };

    try {
      await onSubmit(payload);
      // Reset form on success — parent typically also closes the
      // panel, but if it doesn't, the operator can immediately enter
      // the next walk-in.
      setName("");
      setPhone("");
      setGroupId("");
      setActualPax("1");
      setNotes("");
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Gagal menyimpan walk-in.",
      );
    }
  }

  const surfaceError = error ?? localError;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-6 lg:p-7"
    >
      <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-coral)]">
        Walk-in
      </p>
      <h3 className="d-serif mt-2 text-[22px] font-extralight leading-tight text-[var(--d-ink)]">
        Tamu di luar{" "}
        <em className="d-serif italic text-[var(--d-coral)]">undangan</em>.
      </h3>
      <p className="mt-2 max-w-[40ch] text-[12.5px] leading-relaxed text-[var(--d-ink-dim)]">
        Catat tamu yang datang tanpa undangan resmi. Mereka akan masuk
        daftar tamu sekaligus dianggap sudah hadir.
      </p>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="md:col-span-2 block">
          <span className={labelClass}>
            Nama <span className="text-[var(--d-coral)]">*</span>
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Bapak Hadi Sutrisno"
            className={inputClass}
            disabled={busy}
          />
        </label>

        <label className="block">
          <span className={labelClass}>No. WhatsApp</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+62 812 3456 7890"
            className={inputClass}
            disabled={busy}
            inputMode="tel"
          />
        </label>

        <label className="block">
          <span className={labelClass}>
            Pax <span className="text-[var(--d-coral)]">*</span>
          </span>
          <input
            type="number"
            min={1}
            max={20}
            value={actualPax}
            onChange={(e) => setActualPax(e.target.value)}
            required
            className={inputClass}
            disabled={busy}
            inputMode="numeric"
          />
        </label>

        <label className="block">
          <span className={labelClass}>Grup</span>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className={`${inputClass} bg-[var(--d-bg-2)]`}
            disabled={busy}
          >
            <option value="">Tanpa grup</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={labelClass}>Operator</span>
          <input
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            placeholder="Nama operator"
            className={inputClass}
            disabled={busy}
          />
        </label>

        <label className="md:col-span-2 block">
          <span className={labelClass}>Catatan</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder='Mis. "Datang membawa hadiah dari Pak Hadi"'
            className={inputClass}
            disabled={busy}
            maxLength={280}
          />
        </label>
      </div>

      {surfaceError && (
        <p className="mt-5 rounded-md border border-[rgba(240,160,156,0.3)] bg-[rgba(240,160,156,0.08)] px-3 py-2 text-sm text-[var(--d-coral)]">
          {surfaceError}
        </p>
      )}

      <div className="mt-7 flex flex-wrap items-center justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="d-mono rounded-full border border-[var(--d-line-strong)] px-5 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)] transition-colors hover:bg-[var(--d-bg-2)] hover:text-[var(--d-ink)] disabled:opacity-50"
          >
            Batal
          </button>
        )}
        <button
          type="submit"
          disabled={busy}
          className="d-mono inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Menyimpan…" : "Catat & Check-in"}
        </button>
      </div>
    </form>
  );
}
