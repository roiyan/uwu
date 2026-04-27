"use client";

import { useMemo, useState } from "react";

export type ArrivalRow = {
  id: string;
  checkedInAt: Date | null;
  actualPax: number | null;
  rsvpAttendees: number | null;
  rsvpStatus: "baru" | "diundang" | "dibuka" | "hadir" | "tidak_hadir";
};

export type ArrivalSchedule = {
  id: string;
  label: string;
  eventDate: string; // YYYY-MM-DD
  startTime: string | null; // HH:MM:SS
  endTime: string | null;
};

const HOURS_LABEL_INTERVAL = 30; // show a label every 30 minutes
const SLOT_MINUTES = 15;

function parseTimeToMinutes(time: string | null): number | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function minutesToLabel(total: number): string {
  const hour = ((Math.floor(total / 60) % 24) + 24) % 24;
  const min = ((total % 60) + 60) % 60;
  return `${pad(hour)}:${pad(min)}`;
}

/**
 * Pull the local "minutes since midnight" for a given UTC timestamp,
 * relative to a target IANA timezone. We use Intl.DateTimeFormat in
 * 24-hour form rather than `Date.getHours()` (which uses the server
 * locale) so the same arrival lands in the same bucket regardless of
 * where the dashboard is rendered.
 */
function getMinutesInTz(date: Date | string, timezone: string): number {
  const d = new Date(date);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return ((hour === 24 ? 0 : hour) % 24) * 60 + minute;
}

function getDateInTz(date: Date | string, timezone: string): string {
  const d = new Date(date);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}

export function ArrivalTimeline({
  arrivals,
  schedules,
  timezone,
}: {
  arrivals: ArrivalRow[];
  schedules: ArrivalSchedule[];
  timezone: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);

  // Pre-bucket arrivals by their schedule date — gives us a fast
  // lookup keyed off the "YYYY-MM-DD" the schedule lives on.
  const arrivalsByDate = useMemo(() => {
    const map = new Map<string, ArrivalRow[]>();
    for (const a of arrivals) {
      if (!a.checkedInAt) continue;
      const key = getDateInTz(a.checkedInAt, timezone);
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return map;
  }, [arrivals, timezone]);

  // No schedule rows? Fall back to a single virtual schedule that
  // spans the actual check-in times so the chart still shows.
  const fallbackSchedule = useMemo<ArrivalSchedule | null>(() => {
    if (schedules.length > 0) return null;
    const first = arrivals[0]?.checkedInAt;
    const last = arrivals[arrivals.length - 1]?.checkedInAt;
    if (!first || !last) return null;
    const date = getDateInTz(first, timezone);
    return {
      id: "virtual",
      label: "Hari Pernikahan",
      eventDate: date,
      startTime: null,
      endTime: null,
    };
  }, [arrivals, schedules, timezone]);

  const visibleSchedules = schedules.length > 0 ? schedules : fallbackSchedule ? [fallbackSchedule] : [];
  if (arrivals.length === 0 || visibleSchedules.length === 0) return null;
  const active = visibleSchedules[Math.min(activeIdx, visibleSchedules.length - 1)];

  const startMin = parseTimeToMinutes(active.startTime);
  const endMin = parseTimeToMinutes(active.endTime);

  // Resolve the visible window. With a real schedule we pad ±30 min /
  // +60 min around it so the operator sees both the early arrivals and
  // a tail of stragglers. Without one we fit-to-data.
  const dayArrivals = arrivalsByDate.get(active.eventDate) ?? [];
  const arrivalMinutes = dayArrivals.map((a) =>
    getMinutesInTz(a.checkedInAt!, timezone),
  );

  let rangeStart: number;
  let rangeEnd: number;
  if (startMin != null && endMin != null) {
    rangeStart = Math.min(startMin - 30, ...arrivalMinutes);
    rangeEnd = Math.max(endMin + 60, ...arrivalMinutes.map((m) => m + SLOT_MINUTES));
  } else if (arrivalMinutes.length > 0) {
    rangeStart = Math.min(...arrivalMinutes) - 15;
    rangeEnd = Math.max(...arrivalMinutes) + 30;
  } else {
    rangeStart = 0;
    rangeEnd = 0;
  }

  // Snap to 15-min grid.
  rangeStart = Math.floor(rangeStart / SLOT_MINUTES) * SLOT_MINUTES;
  rangeEnd = Math.ceil(rangeEnd / SLOT_MINUTES) * SLOT_MINUTES;

  type Slot = {
    time: number;
    label: string;
    count: number;
    pax: number;
    inSchedule: boolean;
  };

  const slots: Slot[] = [];
  for (let t = rangeStart; t < rangeEnd; t += SLOT_MINUTES) {
    const inWindow = dayArrivals.filter((a) => {
      const m = getMinutesInTz(a.checkedInAt!, timezone);
      return m >= t && m < t + SLOT_MINUTES;
    });
    slots.push({
      time: t,
      label: minutesToLabel(t),
      count: inWindow.length,
      pax: inWindow.reduce(
        (s, a) => s + (a.actualPax ?? a.rsvpAttendees ?? 1),
        0,
      ),
      inSchedule: startMin != null && endMin != null && t >= startMin && t < endMin,
    });
  }

  const maxPax = Math.max(1, ...slots.map((s) => s.pax));
  const peakSlot = slots.reduce(
    (max, s) => (s.pax > max.pax ? s : max),
    slots[0] ?? { time: 0, label: "—", count: 0, pax: 0, inSchedule: false },
  );
  const totalPax = slots.reduce((s, x) => s + x.pax, 0);
  const totalCount = slots.reduce((s, x) => s + x.count, 0);

  const hasMultipleSchedules = visibleSchedules.length > 1;
  const canPrev = activeIdx > 0;
  const canNext = activeIdx < visibleSchedules.length - 1;

  return (
    <section className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-7">
      <p className="d-mono text-[10px] uppercase tracking-[0.28em] text-[var(--d-coral)]">
        Kedatangan Tamu
      </p>
      <h3 className="d-serif mt-2 text-[22px] font-light leading-tight tracking-[-0.01em] text-[var(--d-ink)]">
        Kapan mereka{" "}
        <em className="d-serif italic text-[var(--d-coral)]">tiba</em>?
      </h3>
      <p className="d-serif mt-1.5 text-[12.5px] italic text-[var(--d-ink-dim)]">
        Setiap kotak menampung 15 menit cerita kedatangan.
      </p>

      {hasMultipleSchedules && (
        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
            disabled={!canPrev}
            aria-label="Acara sebelumnya"
            className="d-mono rounded-full border border-[var(--d-line)] px-3 py-1.5 text-[10px] text-[var(--d-ink)] transition-opacity hover:border-[var(--d-coral)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            ◀
          </button>
          <div className="text-center">
            <div className="d-serif text-[15px] font-light text-[var(--d-ink)]">
              {active.label}
            </div>
            <div className="d-mono text-[10px] uppercase tracking-[0.16em] text-[var(--d-ink-faint)]">
              {active.startTime && active.endTime
                ? `${active.startTime.slice(0, 5)} — ${active.endTime.slice(0, 5)}`
                : "tanpa jadwal"}
              {" · "}
              {activeIdx + 1}/{visibleSchedules.length}
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setActiveIdx((i) => Math.min(visibleSchedules.length - 1, i + 1))
            }
            disabled={!canNext}
            aria-label="Acara berikutnya"
            className="d-mono rounded-full border border-[var(--d-line)] px-3 py-1.5 text-[10px] text-[var(--d-ink)] transition-opacity hover:border-[var(--d-coral)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            ▶
          </button>
        </div>
      )}

      <div className="mt-5 flex h-[140px] items-end gap-[2px] px-1">
        {slots.map((slot, i) => {
          const heightPct =
            slot.pax > 0 ? Math.max((slot.pax / maxPax) * 100, 8) : 0;
          return (
            <div
              key={i}
              className="relative flex h-full flex-1 items-end justify-center"
              title={`${slot.label} — ${slot.pax} orang (${slot.count} tamu)`}
            >
              <div
                className="w-full max-w-[28px] rounded-t-[4px] transition-[height] duration-300"
                style={{
                  height: `${heightPct}%`,
                  background:
                    slot.pax === 0
                      ? "transparent"
                      : slot.inSchedule
                        ? "linear-gradient(to top, rgba(240,160,156,0.6), rgba(240,160,156,0.3))"
                        : "linear-gradient(to top, rgba(240,160,156,0.3), rgba(240,160,156,0.15))",
                }}
              />
              {slot.pax > 0 && (
                <span className="d-mono pointer-events-none absolute -top-[18px] w-full text-center text-[9px] text-[var(--d-ink-dim)]">
                  {slot.pax}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-1 flex gap-[2px]">
        {slots.map((slot, i) => (
          <div
            key={i}
            className="d-mono flex-1 text-center text-[8.5px] text-[var(--d-ink-faint)]"
            style={{
              visibility: slot.time % HOURS_LABEL_INTERVAL === 0 ? "visible" : "hidden",
            }}
          >
            {slot.label}
          </div>
        ))}
      </div>

      <div className="d-mono mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] uppercase tracking-[0.14em] text-[var(--d-ink-faint)]">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-1 w-3 rounded-[2px]"
            style={{ background: "rgba(240,160,156,0.5)" }}
          />
          Saat acara berlangsung
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-1 w-3 rounded-[2px]"
            style={{ background: "rgba(240,160,156,0.2)" }}
          />
          Sebelum / sesudah jadwal
        </span>
      </div>

      <div className="d-mono mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--d-line)] pt-3 text-[10px] uppercase tracking-[0.14em]">
        <span className="text-[var(--d-ink-faint)]">
          Puncak: {peakSlot.label} · {peakSlot.pax} orang
        </span>
        <span className="text-[var(--d-coral)]">
          Total: {totalPax} orang · {totalCount} tamu
        </span>
      </div>
    </section>
  );
}
