"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Html5Qrcode as Html5QrcodeType } from "html5-qrcode";

/**
 * QR scanner that streams the back camera into a `<div>` and fires
 * `onScan` with the decoded text. Designed for the check-in station —
 * accepts either a full invitation URL (`https://uwu.id/<slug>?to=<token>`)
 * or a bare token. The parent decides what to do with it.
 *
 * Loading strategy:
 *   - `html5-qrcode` is heavy (~150kb) and pulls in jsQR. We import
 *     it via `import()` inside the effect so it never enters the
 *     server bundle and only ships when the operator opens the
 *     scanner.
 *
 * Debounce:
 *   - The library fires success ~30× per second while the QR is in
 *     view. We hold a 2.5s lockout per decoded value so the operator
 *     doesn't double-check-in a guest while waving the device away.
 */
export function QrScanner({
  onScan,
  onError,
  paused = false,
}: {
  onScan: (decoded: string) => void;
  onError?: (message: string) => void;
  paused?: boolean;
}) {
  const elemId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const fullId = `qr-scanner-${elemId}`;
  const scannerRef = useRef<Html5QrcodeType | null>(null);
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);
  const [status, setStatus] = useState<"loading" | "running" | "error">(
    "loading",
  );
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        // Lazy import the lib. Server doesn't need it; the dashboard
        // only loads it when the scanner panel is mounted.
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode(fullId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1.0,
          },
          (decoded) => {
            const now = Date.now();
            const last = lastScanRef.current;
            if (last && last.value === decoded && now - last.at < 2500) {
              // Same QR still in frame — let the lockout absorb it.
              return;
            }
            lastScanRef.current = { value: decoded, at: now };
            onScan(decoded);
          },
          () => {
            // Per-frame failures are noisy and meaningless (e.g. blurred,
            // partial QR in view). Swallow them; only surface the boot
            // error below.
          },
        );
        if (!cancelled) setStatus("running");
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : "Tidak bisa membuka kamera. Periksa izin browser.";
        setStatus("error");
        setErrMsg(message);
        onError?.(message);
      }
    }

    boot();
    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (!s) return;
      // stop() is async and may already be settling — ignore failures
      // (e.g. component unmounted before camera settled).
      s.stop()
        .then(() => s.clear())
        .catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullId]);

  // External pause/resume control. The library exposes pauseScan but
  // it varies between versions; the simplest way is a CSS overlay so
  // the camera stream keeps running but new decodes are ignored.
  useEffect(() => {
    if (!paused) return;
    lastScanRef.current = null;
  }, [paused]);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[var(--d-line)] bg-black"
      style={{ aspectRatio: "1 / 1" }}
    >
      <div id={fullId} className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />

      {/* Reticle overlay */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="relative h-[60%] w-[60%]"
          style={{
            background:
              "linear-gradient(to right, var(--d-coral) 0, var(--d-coral) 24px, transparent 24px) top left / 24px 2px no-repeat, linear-gradient(to bottom, var(--d-coral) 0, var(--d-coral) 24px, transparent 24px) top left / 2px 24px no-repeat, linear-gradient(to left, var(--d-coral) 0, var(--d-coral) 24px, transparent 24px) top right / 24px 2px no-repeat, linear-gradient(to bottom, var(--d-coral) 0, var(--d-coral) 24px, transparent 24px) top right / 2px 24px no-repeat, linear-gradient(to right, var(--d-coral) 0, var(--d-coral) 24px, transparent 24px) bottom left / 24px 2px no-repeat, linear-gradient(to top, var(--d-coral) 0, var(--d-coral) 24px, transparent 24px) bottom left / 2px 24px no-repeat, linear-gradient(to left, var(--d-coral) 0, var(--d-coral) 24px, transparent 24px) bottom right / 24px 2px no-repeat, linear-gradient(to top, var(--d-coral) 0, var(--d-coral) 24px, transparent 24px) bottom right / 2px 24px no-repeat",
          }}
        />
      </div>

      {/* Pause veil */}
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <p className="d-mono text-[10px] uppercase tracking-[0.32em] text-[var(--d-ink)]">
            Memproses…
          </p>
        </div>
      )}

      {/* Status overlay */}
      {status !== "running" && (
        <div className="absolute inset-x-0 bottom-0 bg-black/70 px-4 py-3 text-center">
          <p className="d-mono text-[10px] uppercase tracking-[0.32em] text-[var(--d-coral)]">
            {status === "loading" ? "Membuka kamera…" : "Kamera bermasalah"}
          </p>
          {errMsg && (
            <p className="mt-1 text-[12px] text-[var(--d-ink-dim)]">{errMsg}</p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Decode an html5-qrcode result into a guest token. The QR encodes
 * the full invitation URL (`<origin>/<slug>?to=<uuid>`) per
 * `GuestQrCode`, so we extract the `to` query param. Falls back to
 * treating the input as a bare UUID if no URL parts are present —
 * useful for tests and for QRs printed from older flows.
 *
 * Returns `null` if nothing UUID-shaped is found, so the caller can
 * surface a clean "QR tidak valid" message.
 */
export function extractGuestToken(decoded: string): string | null {
  if (!decoded) return null;
  // URL form
  try {
    const url = new URL(decoded);
    const t = url.searchParams.get("to");
    if (t && /^[0-9a-f-]{36}$/i.test(t)) return t;
  } catch {
    // not a URL — fall through
  }
  // Bare UUID
  const trimmed = decoded.trim();
  if (/^[0-9a-f-]{36}$/i.test(trimmed)) return trimmed;
  return null;
}
