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

type Phase =
  | "loading"
  | "ready"
  | "sending"
  | "paused"
  | "completed"
  | "stopped";

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
  // 2-step flow: countdown + "Sudah Terkirim" only show once we know
  // the WA tab actually opened. When the popup is blocked, waOpened
  // stays false and the user is forced to click the explicit "Buka
  // WhatsApp" CTA — preventing accidental skips that mark guests as
  // sent without ever opening WA.
  const [waOpened, setWaOpened] = useState(false);
  const [waUrl, setWaUrl] = useState<string | null>(null);
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
        // Stop in "ready" so the user can confirm the audience before
        // we start opening WA tabs. Sending always starts at index 0
        // and walks every pending delivery — broadcast = kirim ke
        // semua, bukan hanya yang di-preview di compose form.
        setPhase(pending.length === 0 ? "completed" : "ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Gagal memuat data");
      });
    return () => {
      cancelled = true;
    };
  }, [messageId]);

  // Step 1: when a fresh cursor enters "sending", attempt to open
  // the WA tab. Sets waOpened=true on success → step 2 effect kicks
  // in. On block, waOpened stays false and the user must click the
  // manual CTA — no skip path until they explicitly confirm.
  useEffect(() => {
    if (phase !== "sending") return;
    cursorRef.current = cursor;
    const d = deliveries[cursor];
    if (!d) {
      setPhase("completed");
      return;
    }

    // Reset the 2-step gate for the new guest.
    setWaOpened(false);
    setWaUrl(null);

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

    const url = buildWaUrl(phone, d.personalisedBody);
    setWaUrl(url);

    let opened: Window | null = null;
    try {
      opened = window.open(url, "_blank");
    } catch {
      opened = null;
    }
    if (opened) {
      // Popup succeeded → step 2 (countdown effect picks up).
      setWaOpened(true);
    }
    // else: popup blocked — stay on waOpened=false. Render shows a
    // big "Buka WhatsApp" CTA; clicking it flips waOpened=true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, cursor, deliveries]);

  // Step 2: countdown only runs when WA has actually been opened
  // (popup success OR user clicked the manual CTA). This is the gate
  // that prevents accidental "Sudah Terkirim" without ever opening WA.
  useEffect(() => {
    if (phase !== "sending" || !waOpened) return;
    const d = deliveries[cursor];
    if (!d) return;

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
  }, [phase, waOpened, cursor, deliveries]);

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

  async function skipCurrent() {
    const d = deliveries[cursor];
    if (!d) return;
    const res = await markDeliverySkippedAction(
      eventId,
      d.id,
      "Dilewati oleh pengirim",
    );
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setLog((prev) => [
      {
        id: d.id,
        index: cursor + 1,
        name: d.recipientName ?? "Tamu",
        kind: "skipped",
        reason: "dilewati",
      },
      ...prev,
    ]);
    if (cursor + 1 >= deliveries.length) {
      setPhase("completed");
      router.refresh();
    } else {
      advance();
    }
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
      <div className="rounded-2xl border border-[rgba(240,160,156,0.3)] bg-[rgba(240,160,156,0.08)] p-6 text-sm text-[var(--d-coral)]">
        <p className="font-medium">Gagal memuat broadcast.</p>
        <p className="mt-1">{error}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 rounded-full border border-rose-dark/30 px-4 py-1.5 text-xs text-[var(--d-coral)] hover:bg-[var(--d-bg-card)]"
        >
          Tutup
        </button>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="rounded-2xl bg-[var(--d-bg-card)] p-6 text-sm text-[var(--d-ink-dim)]">
        Memuat daftar tamu…
      </div>
    );
  }

  if (phase === "ready") {
    const first = deliveries[0];
    const sample = deliveries.slice(0, 5);
    return (
      <div
        className="rounded-[14px] border px-[22px] py-[18px]"
        style={{
          background: "rgba(240,160,156,0.04)",
          borderColor: "rgba(240,160,156,0.18)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
            style={{
              background: "rgba(240,160,156,0.12)",
              color: "var(--d-coral)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-3.5 w-3.5"
            >
              <path d="M22 2L11 13" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h3 className="d-serif text-[15px] text-[var(--d-ink)]">
            Siap Kirim WhatsApp
          </h3>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--d-ink-dim)]">
          Akan mengirim ke{" "}
          <strong className="text-[var(--d-ink)]">
            {deliveries.length} tamu
          </strong>
          , mulai dari{" "}
          <strong className="text-[var(--d-ink)]">
            {first?.recipientName ?? "tamu pertama"}
          </strong>
          . Setiap tamu menerima pesan yang sudah dipersonalisasi.
        </p>
        <div className="mt-3 rounded-[10px] border border-[var(--d-line)] bg-black/20 px-3 py-2.5 text-[12px] text-[var(--d-ink-dim)]">
          <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
            Urutan kirim
          </p>
          <ol className="mt-1.5 list-decimal pl-5 text-[var(--d-ink)]">
            {sample.map((d) => (
              <li key={d.id} className="py-0.5">
                {d.recipientName ?? "Tamu"}
              </li>
            ))}
          </ol>
          {deliveries.length > sample.length && (
            <p className="mt-1 text-[var(--d-ink-faint)]">
              … dan {deliveries.length - sample.length} tamu lainnya
            </p>
          )}
        </div>
        <p className="d-serif mt-3 text-[11.5px] italic text-[var(--d-ink-faint)]">
          Preview di form compose hanya untuk cek template — broadcast
          tetap dikirim ke seluruh audiens terpilih.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setPhase("sending")}
            className="d-mono rounded-full bg-[var(--d-coral)] px-5 py-2 text-[12px] font-medium uppercase tracking-[0.18em] text-[#0B0B15] transition-all hover:-translate-y-px hover:shadow-[0_10px_30px_rgba(240,160,156,0.32)]"
          >
            Mulai Kirim →
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--d-line-strong)] bg-transparent px-4 py-2 text-[12px] text-[var(--d-ink-dim)] transition-colors hover:bg-[var(--d-bg-2)] hover:text-[var(--d-ink)]"
          >
            Batal
          </button>
        </div>
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
      <div className="rounded-2xl bg-[var(--d-bg-card)] p-6 shadow-ghost-sm">
        <h3 className="font-display text-lg text-[var(--d-ink)]">
          {phase === "completed" ? "✅ Broadcast selesai" : "⏹ Dihentikan"}
        </h3>
        <p className="mt-1 text-sm text-[var(--d-ink-dim)]">
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
            className="rounded-full bg-coral px-5 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[var(--d-bg-card)] p-6 shadow-ghost-sm">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-lg text-[var(--d-ink)]">
          📤 Mengirim via WhatsApp
          <span className="ml-2 rounded-full bg-[var(--d-bg-2)] px-2 py-0.5 text-[10px] font-normal text-[var(--d-ink-dim)]">
            mode manual
          </span>
        </h3>
        <span className="text-xs text-[var(--d-ink-dim)]">
          {cursor + 1} / {total}
        </span>
      </header>

      <div className="mb-2 h-2 overflow-hidden rounded-full bg-[var(--d-bg-2)]">
        <div
          className="h-full bg-gradient-brand transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      {current && (
        <div className="rounded-xl bg-[var(--d-bg-2)] px-4 py-3 text-sm">
          <div className="font-medium text-[var(--d-ink)]">
            Saat ini:{" "}
            <span className="font-normal">{current.recipientName ?? "Tamu"}</span>
          </div>
          {!waOpened ? (
            <p className="mt-1 text-xs text-amber-700">
              ⚠️ Browser memblokir popup otomatis. Klik tombol di bawah
              untuk membuka WhatsApp.
            </p>
          ) : (
            <>
              <p className="mt-1 text-xs text-[#3B7A57]">
                ✅ WhatsApp terbuka — kirim pesannya dulu, lalu tekan
                tombol di bawah.
              </p>
              {phase === "sending" && (
                <p className="mt-1 text-xs text-[var(--d-ink-dim)]">
                  Lanjut otomatis dalam: <strong>{countdown}</strong>…
                </p>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!waOpened ? (
          // Step 1: WA hasn't been opened yet for this guest. The only
          // primary CTA is the manual "Buka WhatsApp" anchor; we
          // deliberately do NOT render "Sudah Terkirim" here so the
          // user can't mark the guest as sent before opening WA.
          <a
            href={waUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (!waUrl) return;
              setWaOpened(true);
            }}
            aria-disabled={!waUrl}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium text-white transition-opacity ${
              waUrl
                ? "bg-gradient-to-r from-[#8B9DC3] via-[#B8A0D0] to-[#E8A0A0] hover:opacity-90"
                : "pointer-events-none bg-[var(--d-bg-2)] text-[var(--d-ink-dim)]"
            }`}
          >
            📱 Buka WhatsApp →
          </a>
        ) : (
          // Step 2: WA is open. "Sudah Terkirim" confirms + advances.
          // "Lewati tamu ini" is a small text link, not a primary CTA.
          <button
            type="button"
            onClick={manualConfirm}
            disabled={phase !== "sending" || !current}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#8B9DC3] via-[#B8A0D0] to-[#E8A0A0] px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            Sudah Terkirim →
            {phase === "sending" && countdown > 0 ? ` (${countdown})` : ""}
          </button>
        )}
        {phase === "sending" ? (
          <button
            type="button"
            onClick={pause}
            className="rounded-full border border-[var(--d-line-strong)] px-4 py-2 text-sm text-[var(--d-ink)] hover:bg-[var(--d-bg-2)]"
          >
            ⏸ Jeda
          </button>
        ) : phase === "paused" ? (
          <button
            type="button"
            onClick={resume}
            className="rounded-full border border-[var(--d-line-strong)] px-4 py-2 text-sm text-[var(--d-ink)] hover:bg-[var(--d-bg-2)]"
          >
            ▶ Lanjutkan
          </button>
        ) : null}
        <button
          type="button"
          onClick={stop}
          className="rounded-full border border-rose/40 px-4 py-2 text-sm text-[var(--d-coral)] hover:border border-[rgba(240,160,156,0.3)] bg-[rgba(240,160,156,0.08)]"
        >
          ⏹ Berhenti
        </button>
      </div>

      {/* Skip is a quiet text link, not a button — only meaningful
          once WA has been opened so we don't tempt the user to skip
          past the popup-blocked CTA. */}
      {waOpened && current && (
        <button
          type="button"
          onClick={skipCurrent}
          disabled={phase !== "sending"}
          className="mt-2 text-xs text-[var(--d-ink-dim)] hover:text-[var(--d-ink)] disabled:opacity-50"
        >
          ⏭ Lewati tamu ini
        </button>
      )}

      {log.length > 0 && (
        <div className="mt-5 max-h-48 overflow-y-auto rounded-xl bg-[var(--d-bg-2)] p-3 text-xs">
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
