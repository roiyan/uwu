"use client";

import { useEffect, useState, useTransition } from "react";
import { generateBroadcastMessage } from "@/lib/actions/ai-message";
import {
  CULTURE_PRESETS,
  LANGUAGE_PRESETS,
  RECIPIENT_RELATIONS,
  RECIPIENT_RELATION_LABEL,
  type AiMessageInput,
} from "@/lib/schemas/ai-message";

type Tone = "formal" | "santai" | "puitis";
type EventType = "akad" | "resepsi" | "keduanya";
type Length = "singkat" | "sedang" | "lengkap";

type EventContext = {
  coupleName: string;
  eventDate?: string;
  venue?: string;
  slug: string;
};

export function AiMessageModal({
  open,
  onClose,
  channel,
  eventContext,
  initialNotes,
  onUseMessage,
}: {
  open: boolean;
  onClose: () => void;
  channel: "whatsapp" | "email";
  eventContext: EventContext;
  initialNotes?: string;
  onUseMessage: (text: string) => void;
}) {
  const [tone, setTone] = useState<Tone>("formal");
  const [cultures, setCultures] = useState<string[]>(["Umum"]);
  const [customCulture, setCustomCulture] = useState("");
  const [eventTypes, setEventTypes] = useState<EventType[]>(["keduanya"]);
  const [recipientRelation, setRecipientRelation] = useState<
    (typeof RECIPIENT_RELATIONS)[number]
  >("umum");
  const [language, setLanguage] = useState<string>(LANGUAGE_PRESETS[0]);
  const [customLanguage, setCustomLanguage] = useState("");
  const [length, setLength] = useState<Length>("sedang");
  const [notes, setNotes] = useState(initialNotes ?? "");

  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ESC closes the dialog when not in the middle of a generation.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pending, onClose]);

  if (!open) return null;

  function toggleCulture(c: string) {
    setCultures((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  }

  function toggleEventType(t: EventType) {
    setEventTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  function generate() {
    setError(null);
    if (cultures.length === 0 && !customCulture.trim()) {
      setError("Pilih minimal 1 nuansa budaya.");
      return;
    }
    if (eventTypes.length === 0) {
      setError("Pilih minimal 1 jenis acara.");
      return;
    }

    const payload: AiMessageInput = {
      tone,
      cultures: cultures.length > 0 ? cultures : ["Umum"],
      customCulture: customCulture.trim() || undefined,
      eventTypes,
      recipientRelation,
      language,
      customLanguage: customLanguage.trim() || undefined,
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
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-8"
    >
      <div
        className="absolute inset-0 bg-[color:var(--overlay-modal)]"
        onClick={pending ? undefined : onClose}
      />
      <div className="relative my-auto w-full max-w-2xl rounded-2xl bg-[var(--d-bg-card)] p-6 shadow-ghost-lg">
        <header className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl text-[var(--d-ink)]">✨ Asisten Pesan</h2>
            <p className="mt-1 text-sm text-[var(--d-ink-dim)]">
              Untuk{" "}
              <strong>
                {channel === "whatsapp" ? "WhatsApp" : "Email"}
              </strong>
              {" — "}
              <span className="text-[var(--d-ink-faint)]">
                {eventContext.coupleName}
              </span>
            </p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="text-[var(--d-ink-faint)] hover:text-[var(--d-ink)] disabled:opacity-50"
            aria-label="Tutup"
          >
            ✕
          </button>
        </header>

        <Section label="Gaya Bahasa">
          <Pills
            value={tone}
            options={[
              { id: "formal", label: "Formal" },
              { id: "santai", label: "Santai" },
              { id: "puitis", label: "Puitis" },
            ]}
            onSelect={(v) => setTone(v as Tone)}
          />
        </Section>

        <Section label="Nuansa Budaya">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {CULTURE_PRESETS.map((c) => (
              <CheckboxChip
                key={c}
                checked={cultures.includes(c)}
                label={c}
                onToggle={() => toggleCulture(c)}
              />
            ))}
          </div>
          <input
            type="text"
            value={customCulture}
            onChange={(e) => setCustomCulture(e.target.value)}
            placeholder="Atau ketik sendiri (mis. Adat Dayak, Tionghoa-Jawa)"
            className={inputClass + " mt-2"}
            maxLength={80}
          />
        </Section>

        <Section label="Jenis Acara">
          <div className="flex flex-wrap gap-1.5">
            {(["akad", "resepsi", "keduanya"] as EventType[]).map((t) => (
              <CheckboxChip
                key={t}
                checked={eventTypes.includes(t)}
                label={
                  t === "akad"
                    ? "Akad/Pemberkatan"
                    : t === "resepsi"
                      ? "Resepsi"
                      : "Keduanya"
                }
                onToggle={() => toggleEventType(t)}
              />
            ))}
          </div>
        </Section>

        <Section label="Hubungan Penerima">
          <select
            value={recipientRelation}
            onChange={(e) =>
              setRecipientRelation(
                e.target.value as (typeof RECIPIENT_RELATIONS)[number],
              )
            }
            className={inputClass}
          >
            {RECIPIENT_RELATIONS.map((r) => (
              <option key={r} value={r}>
                {RECIPIENT_RELATION_LABEL[r]}
              </option>
            ))}
          </select>
        </Section>

        <Section label="Bahasa">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className={inputClass}
          >
            {LANGUAGE_PRESETS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={customLanguage}
            onChange={(e) => setCustomLanguage(e.target.value)}
            placeholder="Atau ketik sendiri (mis. Bugis, Manado, Bali)"
            className={inputClass + " mt-2"}
            maxLength={80}
          />
        </Section>

        <Section label="Panjang Pesan">
          <Pills
            value={length}
            options={[
              { id: "singkat", label: "Singkat ~3 baris" },
              { id: "sedang", label: "Sedang ~5 baris" },
              { id: "lengkap", label: "Lengkap ~8 baris" },
            ]}
            onSelect={(v) => setLength(v as Length)}
          />
        </Section>

        <Section label="Catatan tambahan (opsional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="mis. pakai emoji, sebutkan dress code, ada acara adat sebelum resepsi…"
            rows={2}
            maxLength={200}
            className={inputClass + " resize-none"}
          />
          <p className="mt-1 text-xs text-[var(--d-ink-faint)]">
            {notes.length} / 200
          </p>
        </Section>

        {error && (
          <p className="mb-3 rounded-md border border-[rgba(240,160,156,0.3)] bg-[rgba(240,160,156,0.08)] px-3 py-2 text-sm text-[var(--d-coral)]">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="w-full rounded-full bg-coral px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "✨ Generating..." : result ? "✨ Generate Ulang" : "✨ Generate Pesan"}
        </button>

        {pending && !result && (
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-[var(--d-bg-2)]" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--d-bg-2)]" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-[var(--d-bg-2)]" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--d-bg-2)]" />
          </div>
        )}

        {result && (
          <div className="mt-5">
            <div className="text-sm font-medium text-[var(--d-ink)]">Hasil</div>
            <pre className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl bg-[var(--d-bg-2)] p-3 font-mono text-[12.5px] leading-relaxed text-[var(--d-ink)]">
              {result}
            </pre>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={generate}
                disabled={pending}
                className="rounded-full border border-[var(--d-line-strong)] px-4 py-2 text-sm text-[var(--d-ink)] hover:bg-[var(--d-bg-2)] disabled:opacity-60"
              >
                ✨ Generate Ulang
              </button>
              <button
                type="button"
                onClick={() => {
                  onUseMessage(result);
                }}
                className="rounded-full bg-[var(--d-bg-2)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--d-bg-1)]"
              >
                Pakai Pesan Ini
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-[var(--d-line-strong)] bg-[var(--d-bg-card)] px-3 py-2 text-sm outline-none focus:border-[var(--d-coral)] focus:shadow-[var(--focus-ring-navy)]";

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-sm font-medium text-[var(--d-ink)]">{label}</div>
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
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              active
                ? "border-[var(--d-coral)] bg-[var(--d-bg-2)] text-white"
                : "border-[var(--d-line-strong)] text-[var(--d-ink-dim)] hover:bg-[var(--d-bg-2)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function CheckboxChip({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors ${
        checked
          ? "border-[var(--d-coral)] bg-[rgba(143,163,217,0.08)] text-[var(--d-ink)]"
          : "border-[var(--d-line-strong)] text-[var(--d-ink-dim)] hover:bg-[var(--d-bg-2)]"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="sr-only"
      />
      {label}
    </label>
  );
}
