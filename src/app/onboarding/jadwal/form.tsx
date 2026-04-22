"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { saveJadwalAction } from "@/lib/actions/onboarding";
import { VenueMapField } from "@/components/shared/VenueMapField";
import { SaveButton } from "@/components/shared/SaveButton";

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
  "mt-1 w-full rounded-lg border border-[color:var(--border-medium)] bg-white px-4 py-3 text-sm outline-none focus:border-navy focus:shadow-[var(--focus-ring-navy)]";

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
  const [state, formAction] = useActionState(saveJadwalAction, null);

  function update(idx: number, patch: Partial<ScheduleRow>) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  function remove(idx: number) {
    setRows((r) => (r.length > 1 ? r.filter((_, i) => i !== idx) : r));
  }

  return (
    <form action={formAction} className="mt-8 space-y-6">
      <input type="hidden" name="schedules" value={JSON.stringify(rows)} />

      {rows.map((row, idx) => (
        <div key={idx} className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">Acara {idx + 1}</h2>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => remove(idx)}
                className="text-xs text-ink-hint transition-colors hover:text-rose"
              >
                Hapus
              </button>
            )}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-ink">Label acara</span>
              <input
                required
                value={row.label}
                onChange={(e) => update(idx, { label: e.target.value })}
                placeholder="Akad Nikah / Resepsi / Pemberkatan"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Tanggal</span>
              <input
                required
                type="date"
                value={row.eventDate}
                onChange={(e) => update(idx, { eventDate: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Mulai</span>
              <input
                type="time"
                value={row.startTime}
                onChange={(e) => update(idx, { startTime: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Selesai</span>
              <input
                type="time"
                value={row.endTime}
                onChange={(e) => update(idx, { endTime: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-ink">Nama tempat</span>
              <input
                value={row.venueName}
                onChange={(e) => update(idx, { venueName: e.target.value })}
                placeholder="Hotel Mulia Ballroom"
                className={inputClass}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-ink">Alamat</span>
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
          className="w-full rounded-2xl border border-dashed border-[color:var(--border-medium)] bg-surface-card/50 px-4 py-3 text-sm text-ink-muted transition-colors hover:text-navy"
        >
          + Tambah Acara
        </button>
      )}

      {state && !state.ok && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-dark">
          {state.error}
        </p>
      )}

      <div className="flex justify-between">
        <Link
          href="/onboarding/mempelai"
          className="rounded-full border border-[color:var(--border-medium)] px-6 py-3 text-sm font-medium text-navy transition-colors hover:bg-surface-muted"
        >
          Kembali
        </Link>
        <SaveButton idleLabel="Lanjut" />
      </div>
    </form>
  );
}
