"use client";

import { useActionState, useEffect, useState } from "react";
import { submitRsvpAction } from "@/lib/actions/rsvp";

type Palette = { primary: string; secondary: string; accent: string };

type RsvpStatus = "hadir" | "tidak_hadir";

export function RsvpForm({
  token,
  palette,
  initial,
  editing,
}: {
  token: string;
  palette: Palette;
  initial: { status: RsvpStatus; attendees: number; message: string };
  editing: boolean;
}) {
  const [state, action, pending] = useActionState(submitRsvpAction, null);
  const [status, setStatus] = useState<RsvpStatus>(initial.status);
  const [attendees, setAttendees] = useState<number>(initial.attendees);
  const [message, setMessage] = useState<string>(initial.message);
  const [localSaved, setLocalSaved] = useState(false);

  useEffect(() => {
    setStatus(initial.status);
    setAttendees(initial.attendees);
    setMessage(initial.message);
  }, [initial.status, initial.attendees, initial.message]);

  useEffect(() => {
    if (state?.ok) {
      setLocalSaved(true);
      try {
        window.localStorage.removeItem(`uwu:rsvp:${token}`);
      } catch {
        // storage may be disabled
      }
    } else if (state && !state.ok) {
      try {
        window.localStorage.setItem(
          `uwu:rsvp:${token}`,
          JSON.stringify({ status, attendees, message, ts: Date.now() }),
        );
      } catch {
        // noop
      }
    }
  }, [state, token, status, attendees, message]);

  return (
    <form action={action} className="mt-6 space-y-5">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="attendees" value={attendees} />

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setStatus("hadir")}
          className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
            status === "hadir"
              ? "text-white"
              : "border border-[color:var(--border-medium)] text-ink"
          }`}
          style={status === "hadir" ? { background: palette.primary } : undefined}
        >
          ♡ Hadir
        </button>
        <button
          type="button"
          onClick={() => setStatus("tidak_hadir")}
          className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
            status === "tidak_hadir"
              ? "text-white"
              : "border border-[color:var(--border-medium)] text-ink"
          }`}
          style={status === "tidak_hadir" ? { background: "#5A5A72" } : undefined}
        >
          Tidak Hadir
        </button>
      </div>

      {status === "hadir" && (
        <label className="block">
          <span className="text-sm font-medium text-ink">Jumlah yang hadir</span>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAttendees((n) => Math.max(1, n - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border-medium)] text-lg"
              aria-label="Kurangi"
            >
              –
            </button>
            <span className="min-w-[3ch] text-center font-display text-2xl">
              {attendees}
            </span>
            <button
              type="button"
              onClick={() => setAttendees((n) => Math.min(20, n + 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border-medium)] text-lg"
              aria-label="Tambah"
            >
              +
            </button>
            <span className="text-xs text-ink-hint">orang</span>
          </div>
        </label>
      )}

      <label className="block">
        <span className="text-sm font-medium text-ink">Ucapan &amp; doa</span>
        <textarea
          name="message"
          rows={3}
          maxLength={400}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Selamat menempuh hidup baru..."
          className="mt-1 w-full rounded-lg border border-[color:var(--border-medium)] bg-white px-4 py-3 text-sm outline-none focus:border-navy focus:shadow-[var(--focus-ring-navy)]"
        />
      </label>

      {state && !state.ok && (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-dark">
          <p>{state.error}</p>
          <p className="mt-1 text-xs opacity-80">
            Konfirmasi Anda tersimpan sementara. Mohon coba lagi.
          </p>
        </div>
      )}
      {state?.ok && (
        <p className="rounded-md bg-gold-50 px-3 py-2 text-center text-sm text-gold-dark">
          {state.data?.status === "hadir"
            ? "Terima kasih! Kami menantikan kehadiran Anda."
            : "Terima kasih atas konfirmasinya."}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full px-8 py-3 text-sm font-medium text-white transition-colors disabled:opacity-60"
        style={{ background: palette.primary }}
      >
        {pending
          ? "Mengirim..."
          : editing || localSaved
            ? "Perbarui Konfirmasi"
            : "Kirim Konfirmasi"}
      </button>
    </form>
  );
}
