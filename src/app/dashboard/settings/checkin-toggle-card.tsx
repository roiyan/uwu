"use client";

import { useState, useTransition } from "react";
import { setCheckinEnabledAction } from "@/lib/actions/event";
import { useToast } from "@/components/shared/Toast";

export function CheckinToggleCard({
  eventId,
  initialEnabled,
}: {
  eventId: string;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function toggle() {
    if (pending) return;
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      const res = await setCheckinEnabledAction(eventId, next);
      if (res.ok) {
        toast.success(
          next
            ? "Check-in digital diaktifkan"
            : "Check-in digital dinonaktifkan",
        );
      } else {
        setEnabled(!next);
        toast.error(res.error);
      }
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <span aria-hidden className="h-px w-8 bg-[var(--d-coral)]" />
        <p className="d-mono text-[10px] uppercase tracking-[0.32em] text-[var(--d-coral)]">
          Fitur Hari H
        </p>
      </div>
      <div
        className={`relative flex items-start gap-5 rounded-[14px] border p-5 transition-colors ${
          enabled
            ? "border-[var(--d-coral)] bg-[rgba(240,160,156,0.05)]"
            : "border-[var(--d-line)] bg-[var(--d-bg-card)]"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
            Check-in Digital
          </p>
          <h3 className="d-serif mt-2 text-[18px] font-light text-[var(--d-ink)]">
            Sambut tamu yang{" "}
            <em className="d-serif italic text-[var(--d-coral)]">datang</em>.
          </h3>
          <p className="mt-2 max-w-[58ch] text-[12.5px] leading-relaxed text-[var(--d-ink-dim)]">
            Aktifkan fitur penyambutan tamu digital. Operator bisa memindai
            QR atau mencari nama tamu saat mereka tiba di lokasi acara. QR
            akan muncul otomatis di undangan tamu yang sudah RSVP hadir.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={
            enabled
              ? "Nonaktifkan check-in digital"
              : "Aktifkan check-in digital"
          }
          onClick={toggle}
          disabled={pending}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            enabled
              ? "border-[var(--d-coral)] bg-[var(--d-coral)]"
              : "border-[var(--d-line-strong)] bg-[var(--d-bg-2)]"
          }`}
        >
          <span
            aria-hidden
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.3)] transition-transform ${
              enabled ? "translate-x-6" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </section>
  );
}
