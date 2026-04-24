"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveJadwalAction } from "@/lib/actions/onboarding";
import { VenueMapField } from "@/components/shared/VenueMapField";
import { useToast } from "@/components/shared/Toast";

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

const inputClass =
  "mt-1 w-full rounded-xl border border-white/[0.12] bg-white/[0.07] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 transition-colors focus:border-[color:var(--color-brand-lavender)]/60 focus:ring-2 focus:ring-[color:var(--color-brand-lavender)]/20 [color-scheme:dark]";

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
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  function remove(idx: number) {
    setRows((r) => (r.length > 1 ? r.filter((_, i) => i !== idx) : r));
  }

  // onSubmit + preventDefault (not <form action=>) so React 19's form-action
  // transition machinery doesn't interfere with the manual router.push.
  // Navigate immediately; save fires in background. Tema page tolerates
  // not-yet-committed schedules.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    const form = new FormData(e.currentTarget);
    // Rows live in React state, not the form's named fields — inject.
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
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <input type="hidden" name="schedules" value={JSON.stringify(rows)} />

      {rows.map((row, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-white/10 bg-[color:var(--color-dark-surface)] p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-white/90">Acara {idx + 1}</h2>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => remove(idx)}
                className="text-xs text-red-400/60 transition-colors hover:text-red-400"
              >
                Hapus
              </button>
            )}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-white/70">Label acara</span>
              <input
                required
                value={row.label}
                onChange={(e) => update(idx, { label: e.target.value })}
                placeholder="Akad Nikah / Resepsi / Pemberkatan"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-white/70">Tanggal</span>
              <input
                required
                type="date"
                value={row.eventDate}
                onChange={(e) => update(idx, { eventDate: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-white/70">Mulai</span>
              <input
                type="time"
                value={row.startTime}
                onChange={(e) => update(idx, { startTime: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-white/70">Selesai</span>
              <input
                type="time"
                value={row.endTime}
                onChange={(e) => update(idx, { endTime: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-white/70">Nama tempat</span>
              <input
                value={row.venueName}
                onChange={(e) => update(idx, { venueName: e.target.value })}
                placeholder="Hotel Mulia Ballroom"
                className={inputClass}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-white/70">Alamat</span>
              <input
                value={row.venueAddress}
                onChange={(e) => update(idx, { venueAddress: e.target.value })}
                placeholder="Jl. Asia Afrika No.8, Jakarta"
                className={inputClass}
              />
            </label>
            <VenueMapField
              value={row.venueMapUrl}
              onChange={(v) => update(idx, { venueMapUrl: v })}
              venueName={row.venueName}
              venueAddress={row.venueAddress}
            />
          </div>
        </div>
      ))}

      {rows.length < 6 && (
        <button
          type="button"
          onClick={() => setRows((r) => [...r, blankRow()])}
          className="w-full rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-3 text-sm text-white/50 transition-colors hover:border-white/25 hover:text-white/80"
        >
          + Tambah Acara
        </button>
      )}

      {error && (
        <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="flex justify-between">
        <Link
          href="/onboarding/mempelai"
          className="rounded-xl border border-white/[0.12] px-6 py-3 text-sm font-medium text-white/70 transition-colors hover:border-white/25 hover:bg-white/[0.05] hover:text-white"
        >
          ← Kembali
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-8 py-3 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(232,160,160,0.55)] transition-transform hover:scale-[1.02] disabled:opacity-60"
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
