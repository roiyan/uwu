"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveJadwalAction } from "@/lib/actions/onboarding";
import { VenueMapField } from "@/components/shared/VenueMapField";
import { useToast } from "@/components/shared/Toast";
import { writePreview } from "../components/preview-store";

export type ScheduleRow = {
  label: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  venueName: string;
  venueAddress: string;
  venueMapUrl: string;
};

function blankRow(): ScheduleRow {
  return {
    label: "Acara",
    eventDate: "",
    startTime: "",
    endTime: "",
    timezone: "Asia/Jakarta",
    venueName: "",
    venueAddress: "",
    venueMapUrl: "",
  };
}

export function JadwalForm({ initial }: { initial: ScheduleRow[] }) {
  const [rows, setRows] = useState<ScheduleRow[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const toast = useToast();

  function update(idx: number, patch: Partial<ScheduleRow>) {
    setRows((r) => {
      const next = r.map((row, i) => (i === idx ? { ...row, ...patch } : row));
      // Mirror the first event's date/venue to the sidebar preview.
      if (idx === 0) {
        writePreview({
          eventDate: next[0].eventDate ?? "",
          venue: next[0].venueName ?? "",
        });
      }
      return next;
    });
  }

  function remove(idx: number) {
    setRows((r) => (r.length > 1 ? r.filter((_, i) => i !== idx) : r));
  }

  // onSubmit + preventDefault (not <form action=>) so React 19's
  // form-action transition machinery doesn't interfere with the
  // manual router.push. Navigate immediately; save fires in
  // background. Tema page tolerates not-yet-committed schedules.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    const form = new FormData(e.currentTarget);
    form.set("schedules", JSON.stringify(rows));

    setError(null);
    setPending(true);
    toast.success("Tersimpan");
    router.push("/onboarding/tema");

    saveJadwalAction(null, form)
      .then((res) => {
        if (!res.ok) {
          toast.error(res.error || "Gagal menyimpan. Silakan coba lagi.");
          router.push("/onboarding/jadwal");
          setError(res.error ?? null);
        }
      })
      .catch(() => {
        toast.error("Koneksi gagal. Silakan coba lagi.");
        router.push("/onboarding/jadwal");
      })
      .finally(() => setPending(false));
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-6">
      <input type="hidden" name="schedules" value={JSON.stringify(rows)} />

      {rows.map((row, idx) => (
        <section
          key={idx}
          className="rounded-[18px] border border-[var(--ob-line)] bg-[var(--ob-bg-card)] p-6 md:p-8"
        >
          <header className="mb-6 flex items-baseline justify-between gap-3">
            <div>
              <p className="ob-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ob-ink-dim)]">
                Acara {idx + 1}
              </p>
              <h3 className="ob-serif mt-1 text-[20px] font-light text-[var(--ob-ink)]">
                {row.label || "Acara"}
              </h3>
            </div>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => remove(idx)}
                className="ob-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ob-ink-dim)] transition-colors hover:text-[var(--ob-coral)]"
              >
                Hapus
              </button>
            )}
          </header>
          <div className="grid gap-6 md:grid-cols-2">
            <label className="block">
              <span className="ob-eyebrow block">Label acara</span>
              <input
                required
                value={row.label}
                onChange={(e) => update(idx, { label: e.target.value })}
                placeholder="Akad Nikah / Resepsi / Pemberkatan"
                className="ob-input"
              />
            </label>
            <label className="block">
              <span className="ob-eyebrow block">Tanggal</span>
              <input
                required
                type="date"
                value={row.eventDate}
                onChange={(e) => update(idx, { eventDate: e.target.value })}
                className="ob-input [color-scheme:dark]"
              />
            </label>
            <label className="block">
              <span className="ob-eyebrow block">Mulai</span>
              <input
                type="time"
                value={row.startTime}
                onChange={(e) => update(idx, { startTime: e.target.value })}
                className="ob-input [color-scheme:dark]"
              />
            </label>
            <label className="block">
              <span className="ob-eyebrow block">Selesai</span>
              <input
                type="time"
                value={row.endTime}
                onChange={(e) => update(idx, { endTime: e.target.value })}
                className="ob-input [color-scheme:dark]"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="ob-eyebrow block">Nama tempat</span>
              <input
                value={row.venueName}
                onChange={(e) => update(idx, { venueName: e.target.value })}
                placeholder="Hotel Mulia Ballroom"
                className="ob-input"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="ob-eyebrow block">Alamat</span>
              <input
                value={row.venueAddress}
                onChange={(e) => update(idx, { venueAddress: e.target.value })}
                placeholder="Jl. Asia Afrika No.8, Jakarta"
                className="ob-input"
              />
            </label>
            <VenueMapField
              tone="dark"
              value={row.venueMapUrl}
              onChange={(v) => update(idx, { venueMapUrl: v })}
              venueName={row.venueName}
              venueAddress={row.venueAddress}
            />
          </div>
        </section>
      ))}

      {rows.length < 6 && (
        <button
          type="button"
          onClick={() => setRows((r) => [...r, blankRow()])}
          className="w-full rounded-[18px] border border-dashed border-[var(--ob-line-strong)] bg-transparent px-4 py-4 text-[13px] text-[var(--ob-ink-dim)] transition-colors hover:border-[var(--ob-coral)] hover:text-[var(--ob-ink)]"
        >
          + Tambah Acara
        </button>
      )}

      {error && (
        <p className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--ob-line)] pt-6">
        <Link
          href="/onboarding/mempelai"
          className="ob-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ob-ink-dim)] transition-colors hover:text-[var(--ob-ink)]"
        >
          ← Kembali
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-7 py-3 text-[13px] font-medium tracking-wide text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending && (
            <span
              aria-hidden
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          )}
          <span>{pending ? "Menyimpan..." : "Selanjutnya →"}</span>
        </button>
      </div>
    </form>
  );
}
