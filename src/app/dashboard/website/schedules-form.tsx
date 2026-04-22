"use client";

import { useState, useTransition } from "react";
import { updateSchedulesAction } from "@/lib/actions/event";
import { VenueMapField } from "@/components/shared/VenueMapField";
import { useToast } from "@/components/shared/Toast";
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
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function handleSubmit(form: FormData) {
    toast.success("Jadwal tersimpan");
    startTransition(async () => {
      const res = await updateSchedulesAction(eventId, null, form);
      if (!res.ok) toast.error(res.error);
    });
  }

  function update(idx: number, patch: Partial<ScheduleRow>) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  function remove(idx: number) {
    setRows((r) => (r.length > 1 ? r.filter((_, i) => i !== idx) : r));
  }

  return (
    <form action={handleSubmit} className="space-y-6">
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

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-coral px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-coral-dark disabled:opacity-60"
        >
          {pending && (
            <span
              aria-hidden
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          )}
          <span>{pending ? "Menyimpan..." : "Simpan Jadwal"}</span>
        </button>
      </div>
    </form>
  );
}
