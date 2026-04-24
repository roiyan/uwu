"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listDeliveriesForMessage,
  markDeliverySentAction,
  markDeliverySkippedAction,
} from "@/lib/actions/broadcast";

type Delivery = Awaited<ReturnType<typeof listDeliveriesForMessage>>[number];

type LogEntry = {
  id: string;
  index: number;
  name: string;
  kind: "sent" | "skipped";
  reason?: string;
};

type Phase = "loading" | "sending" | "paused" | "completed" | "stopped";

const COUNTDOWN_SECONDS = 3;

/**
 * Client-driven WhatsApp sender for environments where the WA Cloud
 * API isn't configured. Iterates pending deliveries, opens
 * api.whatsapp.com/send in a new tab per guest, lets the user click
 * Send manually, then auto-advances after a 3-second countdown.
 *
 * The parent component creates the broadcast as usual (which inserts
 * messageDeliveries with personalisedBody server-side). This sender
 * fetches those deliveries and walks through them on the client.
 */
export function WaFallbackSender({
  eventId,
  messageId,
  onClose,
}: {
  eventId: string;
  messageId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [cursor, setCursor] = useState(0);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [popupBlocked, setPopupBlocked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Refs avoid stale closures inside the timer callback.
  const cursorRef = useRef(0);
  const pausedRef = useRef(false);
  const stoppedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    listDeliveriesForMessage(messageId)
      .then((rows) => {
        if (cancelled) return;
        // Only iterate ones still pending — completed/failed are skipped.
        const pending = rows.filter((r) => r.status === "pending");
        setDeliveries(pending);
        setPhase(pending.length === 0 ? "completed" : "sending");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Gagal memuat data");
      });
    return () => {
      cancelled = true;
    };
  }, [messageId]);

  // Whenever phase enters "sending" with a fresh cursor, kick off the
  // open-tab + countdown loop for that delivery.
  useEffect(() => {
    if (phase !== "sending") return;
    cursorRef.current = cursor;
    const d = deliveries[cursor];
    if (!d) {
      setPhase("completed");
      return;
    }

    setPopupBlocked(null);

    // Skip rows without a phone — mark as skipped server-side and move on.
    const phone = (d.recipientPhone ?? "").replace(/[^0-9+]/g, "");
    if (!phone) {
      void markDeliverySkippedAction(eventId, d.id, "Tanpa nomor WhatsApp");
      setLog((prev) => [
        {
          id: d.id,
          index: cursor + 1,
          name: d.recipientName ?? "Tamu",
          kind: "skipped",
          reason: "tanpa nomor",
        },
        ...prev,
      ]);
      window.setTimeout(() => {
        if (!stoppedRef.current) advance();
      }, 100);
      return;
    }

    // Open WA. Fall back to a click-this-link card if the popup is blocked.
    const url = buildWaUrl(phone, d.personalisedBody);
    let opened: Window | null = null;
    try {
      opened = window.open(url, "_blank");
    } catch {
      opened = null;
    }
    if (!opened) {
      setPopupBlocked(url);
      return; // user must click manually; advance() called from the link
    }

    // Start countdown.
    setCountdown(COUNTDOWN_SECONDS);
    const id = window.setInterval(() => {
      if (pausedRef.current || stoppedRef.current) return;
      setCountdown((c) => {
        if (c <= 1) {
          window.clearInterval(id);
          if (!stoppedRef.current) {
            void confirmAndAdvance(d, cursor);
          }
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, cursor, deliveries]);

  function advance() {
    if (stoppedRef.current) return;
    setCursor((c) => c + 1);
  }

  async function confirmAndAdvance(d: Delivery, idx: number) {
    const res = await markDeliverySentAction(eventId, d.id, "whatsapp");
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setLog((prev) => [
      {
        id: d.id,
        index: idx + 1,
        name: d.recipientName ?? "Tamu",
        kind: "sent",
      },
      ...prev,
    ]);
    if (idx + 1 >= deliveries.length) {
      setPhase("completed");
      router.refresh();
    } else {
      advance();
    }
  }

  function manualConfirm() {
    const d = deliveries[cursor];
    if (!d) return;
    void confirmAndAdvance(d, cursor);
  }

  function pause() {
    pausedRef.current = true;
    setPhase("paused");
  }

  function resume() {
    pausedRef.current = false;
    setPhase("sending");
  }

  function stop() {
    stoppedRef.current = true;
    pausedRef.current = true;
    setPhase("stopped");
    router.refresh();
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-rose-50 p-6 text-sm text-rose-dark">
        <p className="font-medium">Gagal memuat broadcast.</p>
        <p className="mt-1">{error}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 rounded-full border border-rose-dark/30 px-4 py-1.5 text-xs text-rose-dark hover:bg-white"
        >
          Tutup
        </button>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="rounded-2xl bg-surface-card p-6 text-sm text-ink-muted">
        Memuat daftar tamu…
      </div>
    );
  }

  const sentCount = log.filter((l) => l.kind === "sent").length;
  const skippedCount = log.filter((l) => l.kind === "skipped").length;
  const total = deliveries.length;
  const percent = total > 0 ? Math.round(((cursor + 0) / total) * 100) : 0;
  const current = deliveries[cursor];

  if (phase === "completed" || phase === "stopped") {
    return (
      <div className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
        <h3 className="font-display text-lg text-ink">
          {phase === "completed" ? "✅ Broadcast selesai" : "⏹ Dihentikan"}
        </h3>
        <p className="mt-1 text-sm text-ink-muted">
          {sentCount} terkirim
          {skippedCount > 0 ? ` · ${skippedCount} dilewati` : ""}
          {phase === "stopped"
            ? ` · ${total - sentCount - skippedCount} belum dikirim`
            : ""}
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-coral px-5 py-2 text-sm font-medium text-white hover:bg-coral-dark"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-lg text-ink">
          📤 Mengirim via WhatsApp
          <span className="ml-2 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-normal text-ink-muted">
            mode manual
          </span>
        </h3>
        <span className="text-xs text-ink-muted">
          {cursor + 1} / {total}
        </span>
      </header>

      <div className="mb-2 h-2 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full bg-gradient-brand transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      {current && (
        <div className="rounded-xl bg-surface-muted px-4 py-3 text-sm">
          <div className="font-medium text-ink">
            Saat ini:{" "}
            <span className="font-normal">{current.recipientName ?? "Tamu"}</span>
          </div>
          {popupBlocked ? (
            <div className="mt-2 text-xs text-ink-muted">
              Browser memblokir popup.{" "}
              <a
                href={popupBlocked}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  // Allow the popup-blocked path to advance once the
                  // user clicks the link — they'll see WA, click Send,
                  // come back, and we mark sent.
                  setPopupBlocked(null);
                  // Start countdown immediately on click.
                  setCountdown(COUNTDOWN_SECONDS);
                }}
                className="font-medium text-coral hover:underline"
              >
                Klik di sini untuk membuka WhatsApp →
              </a>
            </div>
          ) : (
            <div className="mt-1 text-xs text-ink-muted">
              📱 Tab WhatsApp terbuka — klik <strong>Kirim</strong> di WA
            </div>
          )}
          {phase === "sending" && !popupBlocked && (
            <div className="mt-2 text-xs text-ink-muted">
              Lanjut otomatis dalam: <strong>{countdown}</strong>…
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={manualConfirm}
          disabled={phase !== "sending" || !current}
          className="rounded-full bg-coral px-5 py-2 text-sm font-medium text-white hover:bg-coral-dark disabled:opacity-60"
        >
          Kirim &amp; Lanjut →
        </button>
        {phase === "sending" ? (
          <button
            type="button"
            onClick={pause}
            className="rounded-full border border-[color:var(--border-medium)] px-4 py-2 text-sm text-navy hover:bg-surface-muted"
          >
            ⏸ Jeda
          </button>
        ) : (
          <button
            type="button"
            onClick={resume}
            className="rounded-full border border-[color:var(--border-medium)] px-4 py-2 text-sm text-navy hover:bg-surface-muted"
          >
            ▶ Lanjutkan
          </button>
        )}
        <button
          type="button"
          onClick={stop}
          className="rounded-full border border-rose/40 px-4 py-2 text-sm text-rose-dark hover:bg-rose-50"
        >
          ⏹ Berhenti
        </button>
      </div>

      {log.length > 0 && (
        <div className="mt-5 max-h-48 overflow-y-auto rounded-xl bg-surface-muted/60 p-3 text-xs">
          {log.slice(0, 30).map((entry) => (
            <div key={entry.id} className="py-0.5">
              {entry.kind === "sent" ? "✅" : "⏭️"} {entry.index}.{" "}
              {entry.name}
              {entry.reason ? ` — ${entry.reason}` : " — terkirim"}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function buildWaUrl(phone: string, body: string): string {
  let p = phone.replace(/[^0-9+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("0")) p = "62" + p.slice(1);
  return `https://api.whatsapp.com/send?phone=${p}&text=${encodeURIComponent(body)}`;
}
