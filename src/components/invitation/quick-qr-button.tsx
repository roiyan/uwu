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
export function isWeddingDayRange(
  eventDate: string,
  timezone: string,
): boolean {
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

/**
 * Controlled QR ticket modal. The trigger lives on the cover screen
 * now ("Tiket Kehadiran" button under "Buka Undangan"); this
 * component is only the lightbox that pops up on demand. Wake Lock
 * keeps the screen lit while the modal is open so guests don't have
 * to fight their phone's auto-dim while waving the code at the door.
 */
export function QrTicketModal({
  open,
  onClose,
  slug,
  token,
  guest,
  palette,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  token: string;
  guest: {
    name: string;
    groupName: string | null;
    pax: number | null;
  };
  palette: Palette;
}) {
  const [qrValue, setQrValue] = useState<string | null>(null);

  useEffect(() => {
    setQrValue(buildInvitationUrl(slug, `?to=${token}`));
  }, [slug, token]);

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
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !qrValue) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="QR kehadiran"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 py-10"
      style={{
        background:
          "linear-gradient(180deg, #06060B 0%, #0E0F18 50%, #06060B 100%)",
      }}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
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
  );
}
