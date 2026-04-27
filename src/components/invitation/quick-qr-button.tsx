"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { buildInvitationUrl } from "@/lib/utils/invitation-url";

type Palette = { primary: string; secondary: string; accent: string };

/**
 * Hari-H window: from H-1 00:00 (event timezone) through H+1 23:59.
 * Day-bucket comparison in `eventDate`'s timezone — i.e. we ask "what
 * day is `now` in the event's IANA zone, and is it within ±1 of the
 * event date?" — instead of the user's local clock, so a guest in WIT
 * stops seeing the QR at the right wall-clock moment for the venue.
 *
 * `eventDate` is a YYYY-MM-DD wall-clock string with no offset — the
 * couple's calendar date for the wedding.
 */
function isWeddingDayRange(eventDate: string, timezone: string): boolean {
  if (!eventDate) return false;
  let nowDate: string;
  try {
    nowDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    nowDate = new Intl.DateTimeFormat("en-CA").format(new Date());
  }
  const ev = new Date(`${eventDate}T00:00:00Z`);
  if (Number.isNaN(ev.getTime())) return false;
  const dayMs = 24 * 60 * 60 * 1000;
  const before = new Date(ev.getTime() - dayMs).toISOString().slice(0, 10);
  const after = new Date(ev.getTime() + dayMs).toISOString().slice(0, 10);
  return nowDate >= before && nowDate <= after;
}

export function QuickQrButton({
  slug,
  token,
  guest,
  palette,
  eventDate,
  eventTimezone,
}: {
  slug: string;
  token: string;
  guest: {
    name: string;
    groupName: string | null;
    pax: number | null;
    checkedInAt: string | null;
  };
  palette: Palette;
  eventDate: string | undefined;
  eventTimezone: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [qrValue, setQrValue] = useState<string | null>(null);

  useEffect(() => {
    setQrValue(buildInvitationUrl(slug, `?to=${token}`));
  }, [slug, token]);

  // Wake Lock — keep the screen lit while the modal is open so the
  // guest can hold their phone up at the door without it dimming.
  useEffect(() => {
    if (!open) return;
    let lock: WakeLockSentinel | null = null;
    const w = window as unknown as {
      navigator: Navigator & {
        wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinel> };
      };
    };
    w.navigator.wakeLock
      ?.request("screen")
      .then((s) => {
        lock = s;
      })
      .catch(() => undefined);
    return () => {
      lock?.release().catch(() => undefined);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const inWindow = isWeddingDayRange(
    eventDate ?? "",
    eventTimezone ?? "Asia/Jakarta",
  );
  if (!inWindow) return null;

  if (guest.checkedInAt) {
    return (
      <div
        role="status"
        className="fixed left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border px-5 py-2.5 text-[12px] backdrop-blur"
        style={{
          bottom: "max(20px, env(safe-area-inset-bottom))",
          background: "rgba(126,211,164,0.16)",
          borderColor: "rgba(126,211,164,0.36)",
          color: "#7ED3A4",
          boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <span className="font-medium">Kehadiran tercatat</span>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes uwuQrFloatPulse {
          0%, 100% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, -4px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .uwu-qr-fab { animation: none !important; }
        }
      `}</style>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Tunjukkan QR kehadiran"
        className="uwu-qr-fab fixed left-1/2 z-40 inline-flex items-center justify-center gap-2.5 rounded-full px-5 py-3.5 text-[13px] font-semibold transition-shadow hover:shadow-[0_12px_40px_rgba(240,160,156,0.5)]"
        style={{
          bottom: "max(20px, env(safe-area-inset-bottom))",
          background: "linear-gradient(135deg, #F0A09C, #F4B8A3)",
          color: "#0B0B15",
          border: "none",
          cursor: "pointer",
          boxShadow:
            "0 8px 32px rgba(240,160,156,0.4), 0 2px 8px rgba(0,0,0,0.2)",
          animation: "uwuQrFloatPulse 3s ease-in-out infinite",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="3" height="3" />
          <path d="M17 14h4v4M14 17h3v4" />
        </svg>
        Tunjukkan QR Kehadiran
      </button>

      {open && qrValue && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="QR kehadiran"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 py-10"
          style={{
            background:
              "linear-gradient(180deg, #06060B 0%, #0E0F18 50%, #06060B 100%)",
          }}
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup"
            className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full text-[18px] transition-colors hover:bg-white/15"
            style={{
              background: "rgba(255,255,255,0.1)",
              color: "#EDE8DE",
              border: "none",
              cursor: "pointer",
            }}
          >
            ✕
          </button>

          <p
            className="mb-5 text-[10px] uppercase tracking-[0.32em]"
            style={{ color: palette.accent, opacity: 0.7 }}
          >
            uwu
          </p>

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-[320px] flex-col items-center rounded-3xl bg-white p-7"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.55)" }}
          >
            <QRCodeSVG
              value={qrValue}
              size={220}
              level="M"
              marginSize={1}
              fgColor="#0B0B15"
              bgColor="#FFFFFF"
            />

            <div className="mt-5 text-center">
              <p
                className="font-display text-[20px] font-semibold leading-tight"
                style={{ color: "#0B0B15" }}
              >
                {guest.name}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                {guest.groupName && (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10.5px]"
                    style={{ background: "#F0F0F5", color: "#5A5A6E" }}
                  >
                    {guest.groupName}
                  </span>
                )}
                {guest.pax !== null && guest.pax > 1 && (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10.5px]"
                    style={{ background: "#F0F0F5", color: "#5A5A6E" }}
                  >
                    {guest.pax} orang
                  </span>
                )}
              </div>
            </div>
          </div>

          <div
            className="mt-6 max-w-[280px] text-center"
            style={{ color: "#EDE8DE" }}
          >
            <p className="font-display text-[15px]">
              Tunjukkan ke penerima tamu
            </p>
            <p
              className="mt-1 font-display text-[12px] italic"
              style={{ color: "#9E9A95" }}
            >
              QR ini akan dipindai saat Anda tiba di lokasi acara.
            </p>
          </div>

          <div
            className="mt-5 flex items-center gap-2 text-[9.5px] uppercase tracking-[0.18em]"
            style={{ color: "#9E9A95" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
            Layar tetap menyala
          </div>
        </div>
      )}
    </>
  );
}
