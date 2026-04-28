"use client";

import { useEffect, useMemo, useState } from "react";
import type { InfographicSectionId } from "./InfographicTemplate";

type Step = "pick" | "generating" | "share";

type SectionOption = {
  id: InfographicSectionId;
  label: string;
  description: string;
};

const SECTIONS: SectionOption[] = [
  {
    id: "kpi",
    label: "Ringkasan Utama",
    description: "Total tamu, hadir, dibuka",
  },
  {
    id: "funnel",
    label: "Perjalanan Respons",
    description: "Diundang → Dibuka → Konfirmasi → Hadir",
  },
  {
    id: "heatmap",
    label: "Pola Aktivitas",
    description: "Pola bukaan per hari & jam",
  },
  {
    id: "responses",
    label: "Daftar Respons Tamu",
    description: "Nama, status, waktu respons",
  },
  {
    id: "messages",
    label: "Doa & Ucapan Terbaik",
    description: "2–3 doa & ucapan tamu",
  },
  {
    id: "summary",
    label: "Status Ringkasan",
    description: "Hadir / Berhalangan / Belum",
  },
];

export function InfographicShareModal({
  open,
  coupleName,
  onClose,
  onGenerate,
}: {
  open: boolean;
  coupleName: string;
  onClose: () => void;
  onGenerate: (
    sections: InfographicSectionId[],
  ) => Promise<string | null>;
}) {
  const [step, setStep] = useState<Step>("pick");
  const [picked, setPicked] = useState<Set<InfographicSectionId>>(
    () => new Set(SECTIONS.map((s) => s.id)),
  );
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset whenever the modal toggles open so a fresh visit always
  // starts at the picker, never an old preview.
  useEffect(() => {
    if (open) {
      setStep("pick");
      setPicked(new Set(SECTIONS.map((s) => s.id)));
      setImageUrl(null);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && step !== "generating") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, step, onClose]);

  const allSelected = picked.size === SECTIONS.length;
  const noneSelected = picked.size === 0;
  const orderedSelected = useMemo(
    () => SECTIONS.filter((s) => picked.has(s.id)).map((s) => s.id),
    [picked],
  );

  function toggle(id: InfographicSectionId) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setPicked(new Set());
    } else {
      setPicked(new Set(SECTIONS.map((s) => s.id)));
    }
  }

  async function handleGenerate() {
    if (noneSelected) return;
    setStep("generating");
    setError(null);
    try {
      const url = await onGenerate(orderedSelected);
      if (!url) throw new Error("Gagal membuat infografis.");
      setImageUrl(url);
      setStep("share");
    } catch (err) {
      console.error("[infographic-modal]", err);
      setError(
        err instanceof Error ? err.message : "Gagal membuat infografis.",
      );
      setStep("pick");
    }
  }

  function handleDownload() {
    if (!imageUrl) return;
    const safe = coupleName
      .replace(/[^\p{L}\p{N}\s&]/gu, "")
      .trim()
      .replace(/\s+/g, "_");
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `Infografis_UWU_${safe || "Acara"}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function shareViaWebShare(text: string): Promise<boolean> {
    if (!imageUrl) return false;
    if (
      typeof navigator === "undefined" ||
      typeof navigator.share !== "function" ||
      typeof navigator.canShare !== "function"
    ) {
      return false;
    }
    try {
      const blob = await fetch(imageUrl).then((r) => r.blob());
      const file = new File([blob], "uwu-infografis.png", {
        type: "image/png",
      });
      if (!navigator.canShare({ files: [file] })) return false;
      await navigator.share({
        files: [file],
        title: "UWU Infografis",
        text,
      });
      return true;
    } catch {
      return false;
    }
  }

  async function handleShareInstagram() {
    const ok = await shareViaWebShare(
      "Lihat ringkasan acara kami! ✨ Dibuat dengan uwu.id",
    );
    if (ok) return;
    // Desktop fallback: download then nudge user to Instagram. The
    // download handles the asset; Instagram doesn't have a desktop URL
    // share intent, so we just open the home page.
    handleDownload();
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  }

  async function handleShareWhatsApp() {
    const ok = await shareViaWebShare(
      "Lihat ringkasan acara kami! ✨ Dibuat dengan uwu.id",
    );
    if (ok) return;
    handleDownload();
    window.open(
      "https://api.whatsapp.com/send?text=" +
        encodeURIComponent(
          "Lihat infografis acara kami! ✨ Dibuat dengan uwu.id",
        ),
      "_blank",
      "noopener,noreferrer",
    );
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="infographic-modal-heading"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
    >
      <button
        type="button"
        aria-label="Tutup"
        onClick={step === "generating" ? undefined : onClose}
        className="absolute inset-0 cursor-default backdrop-blur-md"
        style={{ background: "rgba(0,0,0,0.7)" }}
      />
      <div
        className="theme-dashboard relative w-full max-w-[480px] overflow-hidden rounded-2xl border p-6"
        style={{
          background: "var(--d-bg-1)",
          borderColor: "var(--d-line)",
          color: "var(--d-ink)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
        }}
      >
        {step === "pick" && (
          <PickerStep
            picked={picked}
            allSelected={allSelected}
            noneSelected={noneSelected}
            error={error}
            onToggle={toggle}
            onToggleAll={toggleAll}
            onGenerate={handleGenerate}
            onClose={onClose}
          />
        )}
        {step === "generating" && <GeneratingStep />}
        {step === "share" && imageUrl && (
          <ShareStep
            imageUrl={imageUrl}
            onDownload={handleDownload}
            onShareInstagram={handleShareInstagram}
            onShareWhatsApp={handleShareWhatsApp}
            onBack={onClose}
          />
        )}
      </div>
    </div>
  );
}

function PickerStep({
  picked,
  allSelected,
  noneSelected,
  error,
  onToggle,
  onToggleAll,
  onGenerate,
  onClose,
}: {
  picked: Set<InfographicSectionId>;
  allSelected: boolean;
  noneSelected: boolean;
  error: string | null;
  onToggle: (id: InfographicSectionId) => void;
  onToggleAll: () => void;
  onGenerate: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2
            id="infographic-modal-heading"
            className="d-serif text-[20px] font-light text-[var(--d-ink)]"
          >
            Buat <em className="d-serif italic text-[var(--d-coral)]">Infografis</em>
          </h2>
          <p className="d-serif mt-1 text-[12px] italic text-[var(--d-ink-dim)]">
            Pilih konten yang ingin ditampilkan.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="text-[var(--d-ink-faint)] transition-colors hover:text-[var(--d-ink)]"
        >
          ✕
        </button>
      </header>

      <ul className="my-4 divide-y divide-[var(--d-line)]">
        {SECTIONS.map((s) => {
          const checked = picked.has(s.id);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onToggle(s.id)}
                className="flex w-full items-start gap-3 py-2.5 text-left"
              >
                <span
                  aria-hidden
                  className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px] border-[var(--d-coral)] transition-colors"
                  style={{
                    background: checked ? "var(--d-coral)" : "transparent",
                  }}
                >
                  {checked && (
                    <svg
                      width="11"
                      height="9"
                      viewBox="0 0 11 9"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M1 4.5l3 3L10 1"
                        stroke="#0B0B15"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span className="flex-1">
                  <span className="block text-[13px] text-[var(--d-ink)]">
                    {s.label}
                  </span>
                  <span className="d-serif mt-0.5 block text-[11px] italic text-[var(--d-ink-faint)]">
                    {s.description}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="mb-3 rounded-md border border-[rgba(240,160,156,0.3)] bg-[rgba(240,160,156,0.08)] px-3 py-2 text-[12px] text-[var(--d-coral)]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggleAll}
          className="d-mono text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-dim)] transition-colors hover:text-[var(--d-coral)]"
        >
          {allSelected ? "Batal pilih semua" : "Pilih semua"}
        </button>
        <button
          type="button"
          onClick={onGenerate}
          disabled={noneSelected}
          className="d-mono inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[11.5px] font-medium uppercase tracking-[0.18em] text-[#0B0B15] transition-shadow hover:shadow-[0_10px_30px_rgba(240,160,156,0.3)] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "var(--d-coral)" }}
        >
          Buat Infografis →
        </button>
      </div>
    </>
  );
}

function GeneratingStep() {
  return (
    <div className="py-12 text-center">
      <div
        aria-hidden
        className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-[var(--d-line-strong)] border-t-[var(--d-coral)]"
      />
      <p className="d-serif text-[16px] font-light italic text-[var(--d-ink)]">
        Menyiapkan infografis…
      </p>
      <p className="d-serif mt-2 text-[12px] italic text-[var(--d-ink-dim)]">
        Sebentar lagi siap dibagikan.
      </p>
    </div>
  );
}

function ShareStep({
  imageUrl,
  onDownload,
  onShareInstagram,
  onShareWhatsApp,
  onBack,
}: {
  imageUrl: string;
  onDownload: () => void;
  onShareInstagram: () => void;
  onShareWhatsApp: () => void;
  onBack: () => void;
}) {
  return (
    <div className="text-center">
      <h2 className="d-serif text-[18px] font-light text-[var(--d-ink)]">
        Infografis <em className="d-serif italic text-[var(--d-coral)]">siap</em>{" "}
        dibagikan
      </h2>

      <div
        className="mt-4 max-h-[400px] overflow-auto rounded-xl border border-[var(--d-line)]"
        style={{ background: "rgba(0,0,0,0.3)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Pratinjau infografis"
          className="block w-full"
        />
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onDownload}
          className="d-mono inline-flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 text-[13px] font-medium text-[#0B0B15] transition-shadow hover:shadow-[0_10px_30px_rgba(240,160,156,0.3)]"
          style={{ background: "var(--d-coral)" }}
        >
          <DownloadGlyph /> Simpan ke Perangkat
        </button>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onShareInstagram}
            className="d-mono flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-[12.5px] font-medium text-white transition-transform hover:-translate-y-px"
            style={{
              background:
                "linear-gradient(135deg, #833AB4, #E1306C 50%, #F77737)",
            }}
          >
            <InstagramGlyph /> Instagram
          </button>
          <button
            type="button"
            onClick={onShareWhatsApp}
            className="d-mono flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-[12.5px] font-medium text-white transition-transform hover:-translate-y-px"
            style={{ background: "#25D366" }}
          >
            <WhatsAppGlyph /> WhatsApp
          </button>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="d-mono mt-1 rounded-xl border border-[var(--d-line-strong)] py-2.5 text-[12px] uppercase tracking-[0.18em] text-[var(--d-ink-dim)] transition-colors hover:text-[var(--d-ink)]"
          style={{ background: "transparent" }}
        >
          ← Kembali
        </button>
      </div>
    </div>
  );
}

function DownloadGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

function InstagramGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-4 w-4"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
    </svg>
  );
}

function WhatsAppGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-.9-.4-1.7-.9-2.4-1.6-.6-.6-1.1-1.3-1.5-2-.2-.3 0-.5.1-.6.1-.1.3-.4.5-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.5-.4-.5-.6-.5h-.6c-.2 0-.5.2-.7.4-.7.7-1.1 1.6-1.1 2.6 0 .8.3 1.6.7 2.3 1.4 2 3.1 3.6 5.2 4.6.5.2.9.4 1.4.5.6.2 1.2.2 1.8.1.7-.1 1.4-.6 1.8-1.2.2-.4.2-.7.1-.8 0-.1-.2-.2-.5-.3M12 2C6.5 2 2 6.5 2 12c0 1.7.5 3.4 1.3 4.9L2 22l5.3-1.4c1.5.8 3.1 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2" />
    </svg>
  );
}
