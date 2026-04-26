"use client";

import { useEffect, useState, useTransition } from "react";
import {
  generateOperatorLinkAction,
  getOperatorLinkAction,
  resetOperatorLinkAction,
  type OperatorLink,
} from "@/lib/actions/checkin";
import { useToast } from "@/components/shared/Toast";

/**
 * Settings card sitting under the check-in toggle. Shows the current
 * operator link + PIN if generated; otherwise prompts to mint one.
 * Only renders when the parent has flipped check-in on — generating
 * a link before the feature is enabled would surface broken UX.
 *
 * The PIN is hidden behind a show/hide toggle (default hidden) so
 * couples can have the page open without leaking the digits to a
 * roommate looking over their shoulder. The full URL is always
 * visible because URLs alone aren't sensitive — the PIN is.
 */
export function OperatorLinkCard({
  eventId,
  enabled,
}: {
  eventId: string;
  enabled: boolean;
}) {
  const toast = useToast();
  const [link, setLink] = useState<OperatorLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [showPin, setShowPin] = useState(false);

  // Initial fetch — only when check-in is enabled. If a link already
  // exists from a previous session we want to show it on first paint
  // rather than requiring a regenerate click.
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getOperatorLinkAction(eventId).then((res) => {
      if (cancelled) return;
      if (res.ok) setLink(res.data ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [eventId, enabled]);

  // When the page is opened with #operator-link in the hash (e.g. from
  // /dashboard/checkin's "Buka Pengaturan" CTA), browsers can't resolve
  // the anchor synchronously because the section only mounts once the
  // tab data is available. After the initial fetch settles we scroll
  // ourselves so the operator card is centred in view.
  useEffect(() => {
    if (loading || !enabled) return;
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#operator-link") return;
    const t = window.setTimeout(() => {
      document
        .getElementById("operator-link")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    return () => window.clearTimeout(t);
  }, [loading, enabled]);

  function handleGenerate() {
    startTransition(async () => {
      const res = await generateOperatorLinkAction(eventId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setLink(res.data ?? null);
      setShowPin(true);
      toast.success("Link operator dibuat. PIN tampil di bawah.");
    });
  }

  function handleReset() {
    if (
      !window.confirm(
        "Reset link akan menonaktifkan link lama. Operator yang sedang login akan diminta PIN baru. Lanjut?",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await resetOperatorLinkAction(eventId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setLink(res.data ?? null);
      setShowPin(true);
      toast.success("Link & PIN baru dibuat. Bagikan ulang ke operator.");
    });
  }

  function handleCopyUrl() {
    if (!link) return;
    navigator.clipboard.writeText(link.url).then(
      () => toast.success("Link disalin."),
      () => toast.error("Gagal menyalin — copy manual."),
    );
  }

  function handleShare() {
    if (!link) return;
    const text = `Link check-in untuk acara kami:\n${link.url}\n\nPIN: ${link.pin}\n\nBuka link, masukkan PIN, lalu langsung bisa scan QR tamu. Terima kasih!`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "UWU Check-in Operator", text }).catch(() => {
        // User cancelled / share failed — silent. They can still copy.
      });
    } else if (typeof window !== "undefined") {
      window.open(
        `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  }

  // Hide the whole card when check-in is off — the toggle copy already
  // explains why the operator station isn't reachable.
  if (!enabled) return null;

  return (
    <section id="operator-link" className="space-y-3 scroll-mt-24">
      <div className="flex items-center gap-3">
        <span aria-hidden className="h-px w-8 bg-[var(--d-green)]" />
        <p className="d-mono text-[10px] uppercase tracking-[0.32em] text-[var(--d-green)]">
          Link Operator
        </p>
      </div>
      <div className="rounded-[14px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-5">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[rgba(126,211,164,0.2)] bg-[rgba(126,211,164,0.1)] text-[var(--d-green)]"
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
            <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
              Untuk penerima tamu · tanpa login
            </p>
            <h3 className="d-serif mt-1 text-[18px] font-light text-[var(--d-ink)]">
              Bagikan link &amp;{" "}
              <em className="d-serif italic text-[var(--d-green)]">PIN</em>.
            </h3>
            <p className="mt-2 max-w-[58ch] text-[12.5px] leading-relaxed text-[var(--d-ink-dim)]">
              Bagikan link ini ke penerima tamu, WO, atau siapa pun yang
              membantu di hari H. Mereka bisa scan QR &amp; catat kehadiran
              tanpa akses ke dashboard Anda.
            </p>
          </div>
        </div>

        <div className="mt-5">
          {loading ? (
            <p className="d-serif text-[12.5px] italic text-[var(--d-ink-faint)]">
              Memuat link operator…
            </p>
          ) : !link ? (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={pending}
              className="d-mono w-full rounded-xl border border-dashed border-[var(--d-line-strong)] bg-[rgba(255,255,255,0.02)] px-4 py-4 text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)] transition-colors hover:border-[var(--d-green)] hover:text-[var(--d-green)] disabled:opacity-50"
            >
              {pending ? "Membuat…" : "+ Buat Link Operator"}
            </button>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--d-line)] bg-black/30 p-3">
                <code className="d-mono min-w-0 flex-1 truncate text-[11.5px] text-[var(--d-ink-dim)]">
                  {link.url}
                </code>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="d-mono shrink-0 rounded-lg border border-[var(--d-line-strong)] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-dim)] transition-colors hover:border-[var(--d-ink-dim)] hover:text-[var(--d-ink)]"
                >
                  Salin
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="d-mono shrink-0 rounded-lg border border-[var(--d-line-strong)] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-dim)] transition-colors hover:border-[var(--d-ink-dim)] hover:text-[var(--d-ink)]"
                >
                  Bagikan
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
                    PIN Keamanan
                  </p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="d-mono text-[28px] tracking-[0.32em] text-[var(--d-ink)]">
                      {showPin ? link.pin : "• • • •"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPin((v) => !v)}
                      aria-label={showPin ? "Sembunyikan PIN" : "Tampilkan PIN"}
                      className="text-[var(--d-ink-faint)] transition-colors hover:text-[var(--d-ink)]"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-4 w-4"
                      >
                        {showPin ? (
                          <>
                            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                            <path d="M1 1l22 22" />
                          </>
                        ) : (
                          <>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                  <p className="d-serif mt-2 text-[11.5px] italic text-[var(--d-ink-faint)]">
                    Berikan PIN secara terpisah dari link.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={pending}
                  className="d-mono inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[rgba(224,138,138,0.3)] px-3.5 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--d-coral)] transition-colors hover:border-[var(--d-coral)] hover:bg-[rgba(240,160,156,0.06)] disabled:opacity-50"
                >
                  {pending ? "Reset…" : "Reset Link & PIN"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
