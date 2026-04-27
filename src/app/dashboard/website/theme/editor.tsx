"use client";

import { useActionState, useMemo, useState } from "react";
import {
  selectThemeAction,
  updateThemeConfigAction,
} from "@/lib/actions/event";
import {
  defaultPalette6For,
  mergePalette6,
  type Palette6,
} from "@/lib/theme/palette";

type ThemeOption = {
  id: string;
  slug: string;
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

// Six color slots the couple can recolour, ordered the way the design
// brief presents them: structural slots (background / text) first,
// then the three brand accents. `desc` is rendered under the swatch
// label so the slot purpose stays self-documenting.
const COLOR_FIELDS: Array<{
  key: keyof Palette6;
  label: string;
  desc: string;
}> = [
  {
    key: "background",
    label: "Latar Belakang",
    desc: "Warna dasar undangan",
  },
  {
    key: "headingText",
    label: "Teks Judul",
    desc: "Nama mempelai, judul section",
  },
  {
    key: "bodyText",
    label: "Teks Isi",
    desc: "Paragraf, deskripsi, detail",
  },
  {
    key: "brandPrimary",
    label: "Aksen Utama",
    desc: "Tombol, link, highlight",
  },
  {
    key: "brandLight",
    label: "Aksen Terang",
    desc: "Background card, badge",
  },
  {
    key: "brandDark",
    label: "Aksen Gelap",
    desc: "Footer, kontras",
  },
];

export function ThemeEditor({
  eventId,
  themes,
  selectedId,
  paletteOverride6,
}: {
  eventId: string;
  themes: ThemeOption[];
  selectedId: string | null;
  // The persisted 6-slot override read from `eventThemeConfigs.config.palette6`.
  // Empty object on first render — fields fall back to the theme default.
  paletteOverride6: Partial<Palette6>;
}) {
  const boundSelect = selectThemeAction.bind(null, eventId);
  const boundPalette = updateThemeConfigAction.bind(null, eventId);
  const [selectState, selectAction, selectPending] = useActionState(boundSelect, null);
  const [paletteState, paletteAction, palettePending] = useActionState(boundPalette, null);

  const selectedTheme = useMemo(
    () => themes.find((t) => t.id === selectedId) ?? null,
    [themes, selectedId],
  );

  // Compose the editing palette: theme defaults beneath, persisted
  // override on top. Recomputed only when the selected theme changes.
  const themeDefault: Palette6 = useMemo(
    () =>
      defaultPalette6For(
        selectedTheme?.slug ?? null,
        selectedTheme?.config ?? null,
      ),
    [selectedTheme],
  );
  const initial: Palette6 = useMemo(
    () => mergePalette6(themeDefault, paletteOverride6),
    [themeDefault, paletteOverride6],
  );

  const [palette, setPalette] = useState<Palette6>(initial);

  function updateSlot(key: keyof Palette6, value: string) {
    setPalette((cur) => ({ ...cur, [key]: value }));
  }

  function resetToThemeDefault() {
    setPalette(themeDefault);
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-display text-xl text-[var(--d-ink)]">Pilih Tema</h2>
        <form action={selectAction} className="mt-4 grid gap-4 md:grid-cols-3">
          {themes.map((t) => {
            const preview = defaultPalette6For(t.slug, t.config);
            const isPicked = selectedId === t.id;
            return (
              <label
                key={t.id}
                className={`group flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-[var(--d-bg-card)] text-left shadow-ghost-sm transition-transform hover:-translate-y-0.5 ${
                  isPicked
                    ? "ring-2 ring-[var(--d-coral)]"
                    : "ring-1 ring-[var(--d-line)]"
                }`}
              >
                <input type="radio" name="themeId" value={t.id} defaultChecked={isPicked} className="sr-only" />
                <div
                  className="flex h-36 items-center justify-center"
                  style={{ background: preview.background }}
                >
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-full text-3xl text-white shadow-ghost-md"
                    style={{ background: preview.brandPrimary }}
                  >
                    ♡
                  </div>
                </div>
                <div className="flex-1 space-y-1 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg text-[var(--d-ink)]">{t.name}</h3>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                      style={{ background: preview.brandLight, color: preview.brandDark }}
                    >
                      {tierLabel[t.tier] ?? t.tier}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--d-ink-dim)]">{t.description}</p>
                </div>
              </label>
            );
          })}

          <div className="md:col-span-3 flex items-center justify-between">
            {selectState && !selectState.ok && (
              <p className="text-sm text-[var(--d-coral)]">{selectState.error}</p>
            )}
            {selectState && selectState.ok && (
              <p className="text-sm text-[var(--d-gold)]">Tema diperbarui.</p>
            )}
            <button
              type="submit"
              disabled={selectPending}
              className="ml-auto rounded-full bg-coral px-8 py-3 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60"
            >
              {selectPending ? "Menyimpan..." : "Gunakan Tema"}
            </button>
          </div>
        </form>
      </section>

      {selectedTheme && (
        <section className="rounded-2xl bg-[var(--d-bg-card)] p-6 shadow-ghost-sm">
          <p
            className="text-[10px] uppercase"
            style={{
              fontFamily:
                '"JetBrains Mono", ui-monospace, monospace',
              letterSpacing: "0.26em",
              color: "var(--d-coral)",
            }}
          >
            Palet Warna
          </p>
          <h2
            className="d-serif mt-2 text-[22px] font-extralight"
            style={{ color: "var(--d-ink)" }}
          >
            Sesuaikan{" "}
            <em className="d-serif italic" style={{ color: "var(--d-coral)" }}>
              warna
            </em>{" "}
            undangan.
          </h2>
          <p
            className="d-serif mt-1 text-[12.5px] italic"
            style={{ color: "var(--d-ink-dim)" }}
          >
            Setiap tema punya palet default — sesuaikan sesuai selera kalian.
          </p>

          <form
            action={paletteAction}
            className="mt-6 grid gap-6 md:grid-cols-[1fr_280px]"
          >
            <input type="hidden" name="themeId" value={selectedTheme.id} />
            {/* Hidden inputs carrying the live palette state. The form
                handler in updateThemeConfigAction reads `palette6_*`
                keys; legacy `palette_*` keys are left empty so the
                action derives them from the 6-color set. */}
            {COLOR_FIELDS.map((f) => (
              <input
                key={f.key}
                type="hidden"
                name={`palette6_${f.key}`}
                value={palette[f.key]}
              />
            ))}

            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                {COLOR_FIELDS.map((f) => (
                  <ColorSlotCard
                    key={f.key}
                    label={f.label}
                    desc={f.desc}
                    value={palette[f.key]}
                    onChange={(v) => updateSlot(f.key, v)}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={resetToThemeDefault}
                  className="d-mono text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)] underline-offset-4 transition-colors hover:text-[var(--d-coral)] hover:underline"
                >
                  ↺ Reset ke default tema
                </button>

                {paletteState && !paletteState.ok && (
                  <p className="text-sm text-[var(--d-coral)]">
                    {paletteState.error}
                  </p>
                )}
                {paletteState && paletteState.ok && (
                  <p className="text-sm text-[var(--d-gold)]">
                    Warna tersimpan.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={palettePending}
                  className="d-mono inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-7 py-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {palettePending ? "Menyimpan..." : "Simpan Warna"}
                </button>
              </div>
            </div>

            {/* Live mini-preview rendered with the in-flight palette so
                the couple sees changes before saving. */}
            <PreviewCard palette={palette} />
          </form>
        </section>
      )}
    </div>
  );
}

function ColorSlotCard({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label
      className="flex items-center gap-3 rounded-xl border p-3 transition-colors"
      style={{
        background: "rgba(255,255,255,0.02)",
        borderColor: "var(--d-line)",
      }}
    >
      <span
        className="relative inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg"
        style={{
          background: value,
          border: "2px solid var(--d-line-strong)",
        }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="absolute inset-[-4px] cursor-pointer opacity-0"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] text-[var(--d-ink)]">{label}</span>
        <span
          className="mt-0.5 block truncate text-[10.5px] text-[var(--d-ink-faint)]"
          style={{
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            letterSpacing: "0.04em",
          }}
        >
          {value.toUpperCase()}
        </span>
        <span className="mt-1 block truncate text-[10.5px] text-[var(--d-ink-dim)]">
          {desc}
        </span>
      </span>
    </label>
  );
}

function PreviewCard({ palette }: { palette: Palette6 }) {
  return (
    <div
      className="flex h-64 flex-col items-center justify-center rounded-2xl p-6 text-center"
      style={{ background: palette.background }}
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full text-2xl text-white shadow-ghost-md"
        style={{ background: palette.brandPrimary }}
      >
        ♡
      </div>
      <p
        className="mt-3 font-display text-lg"
        style={{ color: palette.headingText }}
      >
        The Wedding of
      </p>
      <p
        className="font-display text-xl"
        style={{ color: palette.brandPrimary }}
      >
        Anisa &amp; Rizky
      </p>
      <p className="mt-2 text-[12px]" style={{ color: palette.bodyText }}>
        Kepada Yth. Bpk/Ibu/Saudara/i
      </p>
      <span
        className="mt-3 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-wide"
        style={{ background: palette.brandLight, color: palette.brandDark }}
      >
        Pratinjau Warna
      </span>
    </div>
  );
}
