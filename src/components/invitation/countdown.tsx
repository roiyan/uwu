"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Palette } from "./types";

/**
 * Countdown to the wedding day. Reads the first schedule's
 * `eventDate` (YYYY-MM-DD) + `startTime` (HH:MM:SS) + IANA timezone
 * and renders a live D / J / M / D ticker.
 *
 * The target moment is the start of the first schedule (or 00:00 in
 * the event's zone if no time is set). Past-event handling: when the
 * countdown expires we render a soft "Hari ini" / "Telah berlangsung"
 * card instead of negative numbers.
 *
 * staticMode mutes Framer's reveal animation so the editor preview
 * doesn't flash on every keystroke.
 */
export function Countdown({
  eventDate,
  startTime,
  timezone,
  palette,
  staticMode = false,
}: {
  /** YYYY-MM-DD wall-clock date in `timezone`. */
  eventDate: string | null | undefined;
  /** HH:MM or HH:MM:SS, optional. Falls back to 00:00 in `timezone`. */
  startTime: string | null | undefined;
  /** IANA zone (e.g. "Asia/Jakarta"). Defaults to WIB when missing. */
  timezone: string | null | undefined;
  palette: Palette;
  staticMode?: boolean;
}) {
  const target = resolveTarget(
    eventDate,
    startTime,
    timezone || "Asia/Jakarta",
  );
  const [now, setNow] = useState<number>(() => Date.now());

  // 1Hz tick. We could go finer for a smoother seconds digit but the
  // 320×40 ticker visually renders the same — and 1Hz keeps mobile
  // GPU usage near zero. The interval is cleared on unmount + on
  // target change.
  useEffect(() => {
    if (!target) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [target]);

  if (!target) {
    // No schedule → render a minimal placeholder so reordering this
    // section in the editor still produces a visible block. Couples
    // that haven't filled in `acara` see this until they do.
    return (
      <section className="px-6 py-14 text-center">
        <div className="mx-auto max-w-xl rounded-2xl bg-white/70 p-8 backdrop-blur">
          <p
            className="d-mono text-[10px] uppercase tracking-[0.32em]"
            style={{ color: palette.accent }}
          >
            Hitung mundur
          </p>
          <p className="mt-4 font-display text-xl italic">
            Atur tanggal acara untuk memulai hitung mundur.
          </p>
        </div>
      </section>
    );
  }

  const remaining = Math.max(0, target - now);
  const expired = remaining === 0;
  const { days, hours, minutes, seconds } = breakdown(remaining);

  return (
    <section className="px-6 py-14 text-center">
      <motion.div
        {...(staticMode
          ? {}
          : {
              initial: { opacity: 0, y: 24 },
              whileInView: { opacity: 1, y: 0 },
              viewport: { once: true, margin: "-80px" },
              transition: { duration: 0.6 },
            })}
        className="mx-auto max-w-xl"
      >
        <p
          className="d-mono text-[10px] uppercase tracking-[0.32em]"
          style={{ color: palette.accent }}
        >
          {expired ? "Hari ini" : "Hitung mundur ke hari H"}
        </p>
        <h3
          className="mt-3 font-display text-3xl italic"
          style={{ color: palette.primary }}
        >
          {expired ? "Selamat menikmati hari bahagia" : "Tinggal sebentar lagi"}
        </h3>

        {!expired && (
          <div className="mx-auto mt-7 grid max-w-md grid-cols-4 gap-2 sm:gap-4">
            <Cell label="Hari" value={days} palette={palette} />
            <Cell label="Jam" value={hours} palette={palette} />
            <Cell label="Menit" value={minutes} palette={palette} />
            <Cell label="Detik" value={seconds} palette={palette} />
          </div>
        )}
      </motion.div>
    </section>
  );
}

function Cell({
  label,
  value,
  palette,
}: {
  label: string;
  value: number;
  palette: Palette;
}) {
  return (
    <div
      className="rounded-2xl bg-white/75 px-2 py-4 backdrop-blur"
      style={{ borderColor: palette.accent }}
    >
      <p
        className="font-display text-3xl tabular-nums leading-none sm:text-4xl"
        style={{ color: palette.primary }}
      >
        {String(value).padStart(2, "0")}
      </p>
      <p
        className="d-mono mt-2 text-[9px] uppercase tracking-[0.22em]"
        style={{ color: palette.accent }}
      >
        {label}
      </p>
    </div>
  );
}

/**
 * Convert a wall-clock (`YYYY-MM-DD`, `HH:MM[:SS]`, IANA zone) into a
 * UTC epoch. `Date` doesn't accept zone-tagged strings, so we exploit
 * the offset Intl gives us in en-US format and arithmetic our way to
 * the correct epoch.
 */
function resolveTarget(
  eventDate: string | null | undefined,
  startTime: string | null | undefined,
  timezone: string,
): number | null {
  if (!eventDate) return null;
  const [y, m, d] = eventDate.split("-").map((p) => parseInt(p, 10));
  if (!y || !m || !d) return null;

  const [hRaw, miRaw, sRaw] = (startTime || "00:00:00").split(":");
  const h = clamp(parseInt(hRaw ?? "0", 10), 0, 23);
  const mi = clamp(parseInt(miRaw ?? "0", 10), 0, 59);
  const s = clamp(parseInt(sRaw ?? "0", 10), 0, 59);

  // Treat the wall clock as UTC, then shift back by the zone offset.
  const utcGuess = Date.UTC(y, m - 1, d, h, mi, s);
  const offsetMs = zoneOffsetMs(utcGuess, timezone);
  return utcGuess - offsetMs;
}

function clamp(n: number, lo: number, hi: number) {
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
}

/** Offset of `timezone` from UTC at the given UTC epoch, in ms. */
function zoneOffsetMs(utcEpoch: number, timezone: string): number {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = dtf.formatToParts(new Date(utcEpoch));
    const get = (t: string) =>
      parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
    let hour = get("hour");
    if (hour === 24) hour = 0; // some Intl implementations emit "24"
    const asUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      hour,
      get("minute"),
      get("second"),
    );
    return asUtc - utcEpoch;
  } catch {
    return 0;
  }
}

function breakdown(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds };
}
