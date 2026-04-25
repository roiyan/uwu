"use client";

import { useState, useTransition } from "react";
import { generateBroadcastMessage } from "@/lib/actions/ai-message";
import type { AiMessageInput } from "@/lib/schemas/ai-message";

type Tone = "formal" | "santai" | "puitis";
type Length = "singkat" | "sedang" | "lengkap";

type StudioEventContext = {
  coupleName: string;
  brideName?: string;
  groomName?: string;
  eventDate?: string;
  venue?: string;
  slug: string;
};

const TONE_OPTIONS: { id: Tone; label: string }[] = [
  { id: "formal", label: "Formal" },
  { id: "santai", label: "Santai" },
  { id: "puitis", label: "Puitis" },
];

const LANGUAGE_OPTIONS: { id: string; label: string }[] = [
  { id: "Bahasa Indonesia (formal)", label: "Indonesia" },
  { id: "Jawa Krama (halus)", label: "Jawa Halus" },
  { id: "Sunda halus", label: "Sunda" },
  { id: "English only", label: "English" },
];

const CULTURE_OPTIONS: { id: string; label: string }[] = [
  { id: "Islam", label: "Islami" },
  { id: "Adat Jawa", label: "Jawa" },
  { id: "Umum", label: "Umum" },
  { id: "Kristen Protestan", label: "Kristiani" },
];

const LENGTH_OPTIONS: { id: Length; label: string }[] = [
  { id: "singkat", label: "Singkat" },
  { id: "sedang", label: "Sedang" },
  { id: "lengkap", label: "Panjang" },
];

export function AiStudioInline({
  channel,
  eventContext,
  onUseMessage,
}: {
  channel: "whatsapp" | "email";
  eventContext: StudioEventContext;
  onUseMessage: (text: string) => void;
}) {
  const [tone, setTone] = useState<Tone>("formal");
  const [language, setLanguage] = useState<string>(LANGUAGE_OPTIONS[0].id);
  const [culture, setCulture] = useState<string>(CULTURE_OPTIONS[2].id);
  const [length, setLength] = useState<Length>("sedang");
  const [notes, setNotes] = useState(
    "Tambahkan kalimat doa ringkas di akhir, panggil tamu dengan 'Bapak/Ibu/Saudara/i'.",
  );

  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function generate() {
    setError(null);
    const payload: AiMessageInput = {
      tone,
      cultures: [culture],
      eventTypes: ["keduanya"],
      recipientRelation: "umum",
      language,
      length,
      customNotes: notes.trim() || undefined,
      channel,
      eventContext,
    };

    startTransition(async () => {
      const res = await generateBroadcastMessage(payload);
      if (res.ok) {
        setResult(res.message);
      } else {
        setError(res.error);
        setResult(null);
      }
    });
  }

  return (
    <div
      className="relative overflow-hidden rounded-[18px] border border-[rgba(184,157,212,0.2)] p-6 lg:p-7"
      style={{
        background:
          "linear-gradient(135deg, #0F1024 0%, #150F1E 50%, #0F1020 100%)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-[340px] w-[340px] rounded-full opacity-90 blur-[40px]"
        style={{
          background:
            "radial-gradient(circle, rgba(184,157,212,0.18), transparent 70%)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-24 h-[280px] w-[280px] rounded-full opacity-90 blur-[40px]"
        style={{
          background:
            "radial-gradient(circle, rgba(143,163,217,0.15), transparent 70%)",
        }}
      />

      <div className="relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span
              aria-hidden
              className="relative flex h-[42px] w-[42px] items-center justify-center rounded-xl text-[#0B0B15]"
              style={{
                background:
                  "linear-gradient(135deg, var(--d-lilac), var(--d-blue))",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
              >
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </span>
            <div>
              <p className="d-mono text-[10px] uppercase tracking-[0.26em] text-[var(--d-lilac)]">
                UWU Studio · Powered by AI
              </p>
              <h3 className="d-serif mt-1 text-[22px] font-light leading-tight tracking-[-0.01em] text-[var(--d-ink)]">
                Tulis pesan{" "}
                <em className="d-serif italic text-[var(--d-lilac)]">
                  otomatis
                </em>{" "}
                dari preferensi kalian.
              </h3>
            </div>
          </div>
          <span
            className="d-mono inline-flex items-center gap-2 rounded-full border border-[rgba(184,157,212,0.25)] bg-[rgba(184,157,212,0.1)] px-3 py-1.5 text-[9.5px] uppercase tracking-[0.16em] text-[var(--d-lilac)]"
          >
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-[var(--d-lilac)] shadow-[0_0_6px_var(--d-lilac)]"
            />
            Beta · Gratis 5×/hari
          </span>
        </div>

        <p className="d-serif mt-3 text-[12.5px] italic text-[var(--d-ink-dim)]">
          Pilih nada, gaya bahasa, dan budaya — UWU akan menyusun pesan
          undangan yang terasa personal, tanpa template kaku.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <PillField label="Nada">
            <Pills
              value={tone}
              options={TONE_OPTIONS}
              onSelect={setTone}
            />
          </PillField>
          <PillField label="Bahasa">
            <Pills
              value={language}
              options={LANGUAGE_OPTIONS}
              onSelect={setLanguage}
            />
          </PillField>
          <PillField label="Budaya / Acara">
            <Pills
              value={culture}
              options={CULTURE_OPTIONS}
              onSelect={setCulture}
            />
          </PillField>
          <PillField label="Panjang">
            <Pills
              value={length}
              options={LENGTH_OPTIONS}
              onSelect={setLength}
            />
          </PillField>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--d-line)] bg-[rgba(0,0,0,0.3)] p-3.5">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4 shrink-0 text-[var(--d-lilac)]"
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
          </svg>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={200}
            placeholder="Tambahan instruksi, mis: 'singgung kebersamaan saat SMA'..."
            className="d-serif min-w-0 flex-1 bg-transparent text-[13px] italic text-[var(--d-ink)] outline-none placeholder:text-[var(--d-ink-faint)]"
          />
          <button
            type="button"
            onClick={generate}
            disabled={pending}
            className="d-mono inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#0B0B15] transition-transform hover:-translate-y-px hover:shadow-[0_10px_24px_rgba(184,157,212,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              background:
                "linear-gradient(115deg, var(--d-lilac), var(--d-blue))",
            }}
          >
            {pending ? "Generating…" : "Generate"}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-3 w-3"
            >
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-md border border-[rgba(240,160,156,0.3)] bg-[rgba(240,160,156,0.08)] px-3 py-2 text-sm text-[var(--d-coral)]">
            {error}
          </p>
        )}

        {pending && !result && (
          <div className="mt-5 space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-[rgba(255,255,255,0.04)]" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-[rgba(255,255,255,0.04)]" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-[rgba(255,255,255,0.04)]" />
          </div>
        )}

        {result && (
          <div className="mt-5">
            <p className="d-mono mb-2 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
              Hasil
            </p>
            <pre className="d-mono max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[var(--d-line)] bg-[rgba(0,0,0,0.3)] p-4 text-[12.5px] leading-[1.7] text-[var(--d-ink-dim)]">
              {result}
            </pre>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={generate}
                disabled={pending}
                className="d-mono rounded-full border border-[var(--d-line-strong)] px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--d-ink-dim)] transition-colors hover:border-[var(--d-ink-dim)] hover:text-[var(--d-ink)] disabled:opacity-60"
              >
                Generate ulang
              </button>
              <button
                type="button"
                onClick={() => onUseMessage(result)}
                className="d-mono rounded-full px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#0B0B15] transition-transform hover:-translate-y-px hover:shadow-[0_10px_24px_rgba(184,157,212,0.3)]"
                style={{
                  background:
                    "linear-gradient(115deg, var(--d-lilac), var(--d-blue))",
                }}
              >
                Pakai untuk pesan baru
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PillField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="d-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
        {label}
      </label>
      {children}
    </div>
  );
}

function Pills<T extends string>({
  value,
  options,
  onSelect,
}: {
  value: T;
  options: { id: T; label: string }[];
  onSelect: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className={`rounded-full border px-3 py-1.5 text-[11.5px] transition-colors ${
              active
                ? "border-[var(--d-lilac)] bg-[rgba(184,157,212,0.12)] text-[var(--d-lilac)]"
                : "border-[var(--d-line)] bg-[rgba(255,255,255,0.025)] text-[var(--d-ink-dim)] hover:border-[var(--d-ink-dim)] hover:text-[var(--d-ink)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
