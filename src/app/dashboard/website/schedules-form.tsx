"use client";

import { useActionState, useState } from "react";
import { updateSchedulesAction } from "@/lib/actions/event";
import type { ScheduleRow } from "@/app/onboarding/jadwal/form";

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

export function SchedulesForm({
  eventId,
  initial,
}: {
  eventId: string;
  initial: ScheduleRow[];
}) {
  const [rows, setRows] = useState<ScheduleRow[]>(initial);
  const bound = updateSchedulesAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState(bound, null);

  function update(idx: number, patch: Partial<ScheduleRow>) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  function remove(idx: number) {
    setRows((r) => (r.length > 1 ? r.filter((_, i) => i !== idx) : r));
  }

  return (
    <form action={formAction} className="space-y-6">
      <h2 className="font-display text-xl text-ink">Jadwal &amp; Lokasi</h2>
      <input type="hidden" name="schedules" value={JSON.stringify(rows)} />

      {rows.map((row, idx) => (
        <div key={idx} className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base text-ink">Acara {idx + 1}</h3>
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
                className={inputClass}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-ink">Alamat</span>
              <input
                value={row.venueAddress}
                onChange={(e) => update(idx, { venueAddress: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-ink">Link Google Maps</span>
              <input
                type="url"
                value={row.venueMapUrl}
                onChange={(e) => update(idx, { venueMapUrl: e.target.value })}
                placeholder="https://maps.google.com/..."
                className={inputClass}
              />
            </label>
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
      {state && state.ok && (
        <p className="rounded-md bg-gold-50 px-3 py-2 text-sm text-gold-dark">
          Jadwal tersimpan.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-coral px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-coral-dark disabled:opacity-60"
        >
          {pending ? "Menyimpan..." : "Simpan Jadwal"}
        </button>
      </div>
    </form>
  );
}
