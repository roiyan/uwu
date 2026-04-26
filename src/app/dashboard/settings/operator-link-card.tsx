"use client";

import { useMemo, useState, useTransition } from "react";
import {
  generateOperatorLinkAction,
  resetOperatorLinkAction,
} from "@/lib/actions/checkin";
import { useToast } from "@/components/shared/Toast";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export function OperatorLinkCard({
  eventId,
  initialPin,
  initialToken,
  origin,
}: {
  eventId: string;
  initialPin: string | null;
  initialToken: string | null;
  origin: string;
}) {
  const [pin, setPin] = useState(initialPin);
  const [token, setToken] = useState(initialToken);
  const [showPin, setShowPin] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const url = useMemo(
    () =>
      token
        ? `${origin.replace(/\/$/, "")}/check-in/${eventId}?token=${token}`
        : "",
    [origin, eventId, token],
  );

  function handleGenerate() {
    if (pending) return;
    startTransition(async () => {
      const res = await generateOperatorLinkAction(eventId);
      if (res.ok && res.data) {
        setPin(res.data.pin);
        setToken(res.data.token);
        setShowPin(true);
        toast.success("Link operator dibuat");
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  }

  function handleReset() {
    setConfirmReset(false);
    if (pending) return;
    startTransition(async () => {
      const res = await resetOperatorLinkAction(eventId);
      if (res.ok && res.data) {
        setPin(res.data.pin);
        setToken(res.data.token);
        setShowPin(true);
        toast.success("Link & PIN baru dibuat — link lama tidak berlaku");
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  }

  async function copy(text: string, message = "Tersalin") {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch {
      toast.error("Gagal menyalin");
    }
  }

  function share() {
    if (!url || !pin) return;
    const text = `Link check-in untuk acara kami:\n${url}\n\nPIN: ${pin}\n\nBuka link di HP, masukkan PIN, lalu langsung bisa scan QR tamu. Terima kasih sudah membantu di hari spesial kami 🤍`;
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      navigator
        .share({ title: "UWU Check-in Operator", text, url })
        .catch(() => {
          /* user cancelled — silent */
        });
      return;
    }
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  const hasLink = Boolean(pin && token);

  return (
    <>
      <section
        className="rounded-[14px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-5"
        aria-labelledby="operator-link-heading"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
            style={{
              background: "rgba(126,211,164,0.10)",
              color: "var(--d-green)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4"
            >
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h3
              id="operator-link-heading"
              className="d-serif text-[16px] font-light text-[var(--d-ink)]"
            >
              Link Operator Check-in
            </h3>
            <p className="d-mono mt-0.5 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
              Untuk penerima tamu · tanpa perlu login
            </p>
          </div>
        </div>

        <p className="d-serif mt-3 max-w-[60ch] text-[12.5px] italic leading-relaxed text-[var(--d-ink-dim)]">
          Bagikan link ini ke penerima tamu, WO, atau siapa pun yang membantu
          di hari H. Mereka bisa scan QR dan catat kehadiran — tanpa akses ke
          dashboard kalian.
        </p>

        {hasLink ? (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--d-line)] bg-[rgba(0,0,0,0.3)] px-3 py-2.5">
              <code className="d-mono min-w-0 flex-1 truncate text-[11.5px] text-[var(--d-ink-dim)]">
                {url}
              </code>
              <button
                type="button"
                onClick={() => copy(url, "Link tersalin")}
                className="d-mono shrink-0 rounded-lg border border-[var(--d-line-strong)] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-dim)] transition-colors hover:text-[var(--d-ink)]"
              >
                Salin
              </button>
              <button
                type="button"
                onClick={share}
                className="d-mono shrink-0 rounded-lg border border-[var(--d-line-strong)] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-dim)] transition-colors hover:text-[var(--d-ink)]"
              >
                Share
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
                  PIN Keamanan
                </p>
                <div className="mt-1.5 flex items-center gap-3">
                  <span className="d-mono text-[24px] tracking-[0.3em] text-[var(--d-ink)]">
                    {showPin ? pin : "• • • •"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPin((v) => !v)}
                    aria-label={showPin ? "Sembunyikan PIN" : "Tampilkan PIN"}
                    className="text-[var(--d-ink-faint)] transition-colors hover:text-[var(--d-ink)]"
                  >
                    {showPin ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                  {showPin && pin && (
                    <button
                      type="button"
                      onClick={() => copy(pin, "PIN tersalin")}
                      className="d-mono rounded-lg border border-[var(--d-line-strong)] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-dim)] transition-colors hover:text-[var(--d-ink)]"
                    >
                      Salin PIN
                    </button>
                  )}
                </div>
                <p className="d-serif mt-1.5 text-[11px] italic text-[var(--d-ink-faint)]">
                  Berikan PIN ini secara terpisah ke operator.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                disabled={pending}
                className="d-mono inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[rgba(224,138,138,0.5)] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--d-coral)] transition-colors hover:bg-[rgba(224,138,138,0.08)] disabled:opacity-50"
              >
                Reset Link &amp; PIN
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={pending}
            className="d-serif mt-4 w-full rounded-xl border border-dashed border-[var(--d-line-strong)] py-3 text-[14px] italic text-[var(--d-ink-dim)] transition-colors hover:border-[var(--d-ink-faint)] hover:text-[var(--d-ink)] disabled:opacity-50"
          >
            {pending ? "Membuat link…" : "+ Buat Link Operator"}
          </button>
        )}
      </section>

      <ConfirmDialog
        open={confirmReset}
        title="Reset link & PIN?"
        description="Link lama tidak akan bisa dipakai lagi. Setiap operator yang sedang login akan keluar otomatis dan harus memasukkan PIN baru."
        confirmLabel="Ya, reset"
        cancelLabel="Batal"
        loading={pending}
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />
    </>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 5.24A10.93 10.93 0 0112 5c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 11-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );
}
