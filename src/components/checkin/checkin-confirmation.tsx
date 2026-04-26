"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { GuestStatus } from "@/lib/db/queries/guests";
import type { CheckinPayload } from "@/lib/actions/checkin";

const STATUS_LABEL: Record<GuestStatus, string> = {
  baru: "Belum direspons",
  diundang: "Sudah diundang",
  dibuka: "Sudah membuka",
  hadir: "Hadir",
  tidak_hadir: "Tidak hadir",
};

const STATUS_PILL: Record<GuestStatus, string> = {
  baru: "bg-[rgba(237,232,222,0.04)] text-[var(--d-ink-dim)]",
  diundang: "bg-[rgba(143,163,217,0.10)] text-[var(--d-blue)]",
  dibuka: "bg-[rgba(184,157,212,0.10)] text-[var(--d-lilac)]",
  hadir: "bg-[rgba(126,211,164,0.12)] text-[var(--d-green)]",
  tidak_hadir: "bg-[rgba(240,160,156,0.12)] text-[var(--d-coral)]",
};

const STATUS_DOT: Record<GuestStatus, string> = {
  baru: "var(--d-ink-faint)",
  diundang: "var(--d-blue)",
  dibuka: "var(--d-lilac)",
  hadir: "var(--d-green)",
  tidak_hadir: "var(--d-coral)",
};

export type ConfirmationGuest = {
  id: string;
  name: string;
  nickname: string | null;
  groupName: string | null;
  rsvpStatus: GuestStatus;
  rsvpAttendees: number | null;
  // When set, the guest was already checked in earlier — the modal
  // switches to a "already arrived" state with an Undo CTA instead of
  // the Confirm CTA.
  checkedInAt: Date | null;
  actualPax: number | null;
};

/**
 * Modal that appears after a successful QR scan or after the operator
 * picks a guest from search results. Two states:
 *
 *   1. Not yet checked in → confirm pax + notes, primary action runs
 *      `onConfirm({ actualPax, checkinNotes })`.
 *
 *   2. Already checked in → shows the timestamp + a destructive Undo
 *      button that calls `onUndo()`.
 *
 * Payload shape matches what the server actions accept directly so
 * the parent doesn't have to reshape on the way through.
 */
export function CheckinConfirmation({
  open,
  guest,
  defaultOperator = "",
  busy = false,
  error = null,
  onConfirm,
  onUndo,
  onClose,
}: {
  open: boolean;
  guest: ConfirmationGuest | null;
  defaultOperator?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: (payload: CheckinPayload) => Promise<void>;
  onUndo?: () => Promise<void>;
  onClose: () => void;
}) {
  // Default pax to the RSVP'd attendees count, or 1 when no RSVP.
  // The operator can edit before confirming.
  const initialPax = String(guest?.rsvpAttendees ?? 1);
  const [actualPax, setActualPax] = useState(initialPax);
  const [notes, setNotes] = useState("");
  const [operator, setOperator] = useState(defaultOperator);
  const [localError, setLocalError] = useState<string | null>(null);

  // Reset local state whenever the modal opens for a different guest,
  // so a previous operator's pax/notes don't leak into the next scan.
  useEffect(() => {
    if (!open || !guest) return;
    setActualPax(String(guest.rsvpAttendees ?? 1));
    setNotes("");
    setLocalError(null);
    if (defaultOperator) setOperator(defaultOperator);
  }, [open, guest, defaultOperator]);

  // Close on Escape — feels native for a modal.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open || !guest) return null;

  const alreadyCheckedIn = guest.checkedInAt !== null;

  async function handleConfirm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);
    const pax = Number.parseInt(actualPax, 10);
    if (!Number.isFinite(pax) || pax < 1) {
      setLocalError("Jumlah pax minimal 1.");
      return;
    }
    try {
      await onConfirm({
        actualPax: pax,
        checkinNotes: notes.trim() || undefined,
        checkedInBy: operator.trim() || undefined,
      });
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Gagal menyimpan check-in.",
      );
    }
  }

  async function handleUndo() {
    if (!onUndo) return;
    setLocalError(null);
    try {
      await onUndo();
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Gagal membatalkan check-in.",
      );
    }
  }

  const surfaceError = error ?? localError;
  const arrivalTime = alreadyCheckedIn && guest.checkedInAt
    ? new Date(guest.checkedInAt).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Konfirmasi check-in"
      className="theme-dashboard fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-4"
    >
      <button
        type="button"
        aria-label="Tutup"
        onClick={busy ? undefined : onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-[18px] border border-[var(--d-line-strong)] bg-[var(--d-bg-1)] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]">
        {/* Coral glow */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full opacity-50 blur-[60px]"
          style={{
            background:
              "radial-gradient(circle, rgba(240,160,156,0.18), transparent 70%)",
          }}
        />

        <div className="relative px-7 py-6">
          <p className="d-mono text-[10px] uppercase tracking-[0.26em] text-[var(--d-coral)]">
            {alreadyCheckedIn ? "Sudah Hadir" : "Konfirmasi Tiba"}
          </p>
          <h2 className="d-serif mt-2 text-[26px] font-extralight leading-[1.15] tracking-[-0.018em] text-[var(--d-ink)]">
            {guest.name}
            {guest.nickname && (
              <span className="d-serif italic text-[var(--d-coral)]">
                {" "}— {guest.nickname}
              </span>
            )}
          </h2>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-[var(--d-ink-dim)]">
            <span
              className={`d-mono inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] ${STATUS_PILL[guest.rsvpStatus]}`}
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: STATUS_DOT[guest.rsvpStatus] }}
              />
              {STATUS_LABEL[guest.rsvpStatus]}
            </span>
            {guest.groupName && (
              <span className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
                · {guest.groupName}
              </span>
            )}
          </div>

          {alreadyCheckedIn ? (
            <div className="mt-6 rounded-[12px] border border-[var(--d-line)] bg-[var(--d-bg-2)] p-4 text-[13px] text-[var(--d-ink)]">
              <p className="d-serif text-[15px] leading-tight">
                Tiba pukul{" "}
                <em className="d-serif italic text-[var(--d-green)]">
                  {arrivalTime}
                </em>
              </p>
              {typeof guest.actualPax === "number" && (
                <p className="d-mono mt-2 text-[10.5px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
                  {guest.actualPax} pax tercatat
                </p>
              )}
              <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="d-mono rounded-full border border-[var(--d-line-strong)] px-5 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)] transition-colors hover:bg-[var(--d-bg-card)] hover:text-[var(--d-ink)] disabled:opacity-50"
                >
                  Tutup
                </button>
                {onUndo && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={busy}
                    className="d-mono inline-flex items-center gap-2 rounded-full border border-[rgba(240,160,156,0.4)] bg-[rgba(240,160,156,0.08)] px-5 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--d-coral)] transition-colors hover:bg-[rgba(240,160,156,0.14)] disabled:opacity-50"
                  >
                    {busy ? "Memproses…" : "Batalkan Check-in"}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleConfirm} className="mt-6 space-y-5">
              <label className="block">
                <span className="d-mono block text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
                  Pax <span className="text-[var(--d-coral)]">*</span>
                </span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={actualPax}
                  onChange={(e) => setActualPax(e.target.value)}
                  required
                  disabled={busy}
                  className="mt-2 w-full bg-transparent border-0 border-b border-[var(--d-line-strong)] px-0 py-2.5 text-[14px] text-[var(--d-ink)] outline-none focus:border-[var(--d-coral)] transition-colors"
                  inputMode="numeric"
                />
                {typeof guest.rsvpAttendees === "number" && (
                  <span className="d-mono mt-1 block text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
                    RSVP awal: {guest.rsvpAttendees} pax
                  </span>
                )}
              </label>

              <label className="block">
                <span className="d-mono block text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
                  Operator
                </span>
                {defaultOperator ? (
                  <div className="mt-2 flex items-center gap-2 py-2.5 text-[14px] text-[var(--d-ink)]">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full bg-[var(--d-coral)]"
                    />
                    <span>{defaultOperator}</span>
                  </div>
                ) : (
                  <input
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    placeholder="Nama operator"
                    disabled={busy}
                    className="mt-2 w-full bg-transparent border-0 border-b border-[var(--d-line-strong)] px-0 py-2.5 text-[14px] text-[var(--d-ink)] outline-none focus:border-[var(--d-coral)] transition-colors placeholder:text-[var(--d-ink-faint)]"
                  />
                )}
              </label>

              <label className="block">
                <span className="d-mono block text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
                  Catatan
                </span>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder='Opsional — mis. "datang bersama keponakan"'
                  disabled={busy}
                  maxLength={280}
                  className="mt-2 w-full bg-transparent border-0 border-b border-[var(--d-line-strong)] px-0 py-2.5 text-[14px] text-[var(--d-ink)] outline-none focus:border-[var(--d-coral)] transition-colors placeholder:text-[var(--d-ink-faint)]"
                />
              </label>

              {surfaceError && (
                <p className="rounded-md border border-[rgba(240,160,156,0.3)] bg-[rgba(240,160,156,0.08)] px-3 py-2 text-sm text-[var(--d-coral)]">
                  {surfaceError}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="d-mono rounded-full border border-[var(--d-line-strong)] px-5 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)] transition-colors hover:bg-[var(--d-bg-card)] hover:text-[var(--d-ink)] disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="d-mono inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "Menyimpan…" : "Konfirmasi Tiba"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
