"use client";

import { useActionState, useMemo, useState } from "react";
import {
  selectThemeAction,
  updateThemeConfigAction,
} from "@/lib/actions/event";

type ThemeOption = {
  id: string;
  name: string;
  tier: string;
  description: string | null;
  previewImageUrl: string | null;
  config: Record<string, unknown>;
};

const tierLabel: Record<string, string> = {
  basic: "Gratis",
  standard: "Lite",
  premium: "Pro",
};

function defaultPalette(config: Record<string, unknown>) {
  const palette = (config?.palette ?? {}) as Record<string, string>;
  return {
    primary: palette.primary ?? "#C06070",
    secondary: palette.secondary ?? "#FAF6F1",
    accent: palette.accent ?? "#D4A574",
  };
}

export function ThemeEditor({
  eventId,
  themes,
  selectedId,
  paletteOverride,
}: {
  eventId: string;
  themes: ThemeOption[];
  selectedId: string | null;
  paletteOverride: Record<string, string>;
}) {
  const boundSelect = selectThemeAction.bind(null, eventId);
  const boundPalette = updateThemeConfigAction.bind(null, eventId);
  const [selectState, selectAction, selectPending] = useActionState(boundSelect, null);
  const [paletteState, paletteAction, palettePending] = useActionState(boundPalette, null);

  const selectedTheme = useMemo(
    () => themes.find((t) => t.id === selectedId) ?? null,
    [themes, selectedId],
  );

  const base = selectedTheme ? defaultPalette(selectedTheme.config) : null;
  const initPrimary = paletteOverride.primary ?? base?.primary ?? "#C06070";
  const initSecondary = paletteOverride.secondary ?? base?.secondary ?? "#FAF6F1";
  const initAccent = paletteOverride.accent ?? base?.accent ?? "#D4A574";

  const [primary, setPrimary] = useState(initPrimary);
  const [secondary, setSecondary] = useState(initSecondary);
  const [accent, setAccent] = useState(initAccent);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-display text-xl text-ink">Pilih Tema</h2>
        <form action={selectAction} className="mt-4 grid gap-4 md:grid-cols-3">
          {themes.map((t) => {
            const palette = defaultPalette(t.config);
            const isPicked = selectedId === t.id;
            return (
              <label
                key={t.id}
                className={`group flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-surface-card text-left shadow-ghost-sm transition-transform hover:-translate-y-0.5 ${
                  isPicked ? "ring-2 ring-navy" : "ring-1 ring-[color:var(--border-ghost)]"
                }`}
              >
                <input type="radio" name="themeId" value={t.id} defaultChecked={isPicked} className="sr-only" />
                <div
                  className="flex h-36 items-center justify-center"
                  style={{ background: palette.secondary }}
                >
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-full text-3xl text-white shadow-ghost-md"
                    style={{ background: palette.primary }}
                  >
                    ♡
                  </div>
                </div>
                <div className="flex-1 space-y-1 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg text-ink">{t.name}</h3>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                      style={{ background: palette.accent, color: "#1A1A2E" }}
                    >
                      {tierLabel[t.tier] ?? t.tier}
                    </span>
                  </div>
                  <p className="text-sm text-ink-muted">{t.description}</p>
                </div>
              </label>
            );
          })}

          <div className="md:col-span-3 flex items-center justify-between">
            {selectState && !selectState.ok && (
              <p className="text-sm text-rose-dark">{selectState.error}</p>
            )}
            {selectState && selectState.ok && (
              <p className="text-sm text-gold-dark">Tema diperbarui.</p>
            )}
            <button
              type="submit"
              disabled={selectPending}
              className="ml-auto rounded-full bg-coral px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-coral-dark disabled:opacity-60"
            >
              {selectPending ? "Menyimpan..." : "Gunakan Tema"}
            </button>
          </div>
        </form>
      </section>

      {selectedTheme && (
        <section className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
          <h2 className="font-display text-xl text-ink">Kustomisasi Warna</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Sesuaikan palet untuk tema <span className="font-medium">{selectedTheme.name}</span>.
          </p>

          <div className="mt-6 grid gap-6 md:grid-cols-[1fr_280px]">
            <form action={paletteAction} className="space-y-4">
              <input type="hidden" name="themeId" value={selectedTheme.id} />
              <ColorField label="Warna utama" name="palette_primary" value={primary} onChange={setPrimary} />
              <ColorField label="Latar belakang" name="palette_secondary" value={secondary} onChange={setSecondary} />
              <ColorField label="Aksen" name="palette_accent" value={accent} onChange={setAccent} />

              {paletteState && !paletteState.ok && (
                <p className="text-sm text-rose-dark">{paletteState.error}</p>
              )}
              {paletteState && paletteState.ok && (
                <p className="text-sm text-gold-dark">Warna tersimpan.</p>
              )}

              <button
                type="submit"
                disabled={palettePending}
                className="rounded-full bg-navy px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-dark disabled:opacity-60"
              >
                {palettePending ? "Menyimpan..." : "Simpan Warna"}
              </button>
            </form>

            <div
              className="flex h-64 flex-col items-center justify-center rounded-2xl p-6 text-center"
              style={{ background: secondary }}
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-2xl text-white shadow-ghost-md"
                style={{ background: primary }}
              >
                ♡
              </div>
              <p className="mt-3 font-display text-lg" style={{ color: "#1A1A2E" }}>
                The Wedding of
              </p>
              <p className="font-display text-xl" style={{ color: primary }}>
                Anisa &amp; Rizky
              </p>
              <span
                className="mt-3 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-wide"
                style={{ background: accent, color: "#1A1A2E" }}
              >
                Pratinjau Warna
              </span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function ColorField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-14 cursor-pointer rounded-md border border-[color:var(--border-medium)]"
      />
      <div className="flex flex-1 flex-col">
        <span className="text-sm font-medium text-ink">{label}</span>
        <input
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          pattern="^#[0-9A-Fa-f]{6}$"
          className="mt-1 w-full rounded-lg border border-[color:var(--border-medium)] bg-white px-3 py-2 text-sm font-mono outline-none focus:border-navy focus:shadow-[var(--focus-ring-navy)]"
        />
      </div>
    </label>
  );
}
