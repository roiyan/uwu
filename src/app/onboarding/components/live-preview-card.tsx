"use client";

import type { OnboardingPreview } from "./preview-store";

const THEME_PALETTE: Record<
  string,
  { bg: string; ink: string; accent: string; label: string }
> = {
  ivory: {
    bg: "linear-gradient(135deg, #F4E8DA 0%, #E2BE9C 100%)",
    ink: "#2A1F1A",
    accent: "#9C5B3A",
    label: "Ivory Whisper",
  },
  sakura: {
    bg: "linear-gradient(135deg, #FCD9DC 0%, #E89AA1 100%)",
    ink: "#3A1C24",
    accent: "#A14056",
    label: "Sakura Dreams",
  },
  midnight: {
    bg: "linear-gradient(135deg, #1A1F3A 0%, #2C2440 60%, #0E0F18 100%)",
    ink: "#EDE8DE",
    accent: "#D4B896",
    label: "Midnight Gold",
  },
  emerald: {
    bg: "linear-gradient(135deg, #1F3A2D 0%, #2C5840 100%)",
    ink: "#EDE8DE",
    accent: "#D4B896",
    label: "Emerald Forest",
  },
  navy: {
    bg: "linear-gradient(135deg, #1A2A3F 0%, #2C4258 100%)",
    ink: "#EDE8DE",
    accent: "#B89DD4",
    label: "Navy Royale",
  },
  coral: {
    bg: "linear-gradient(135deg, #F4B8A3 0%, #E89AA1 100%)",
    ink: "#3A1C24",
    accent: "#9C5B3A",
    label: "Coral Sunset",
  },
};

function paletteFor(slug: string | null) {
  if (slug && THEME_PALETTE[slug]) return THEME_PALETTE[slug];
  return THEME_PALETTE.ivory;
}

function formatDate(iso: string): string {
  if (!iso) return "Tanggal menyusul";
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function LivePreviewCard({ preview }: { preview: OnboardingPreview }) {
  const palette = paletteFor(preview.themeSlug);
  const bride =
    preview.brideNickname || preview.brideName || "Mempelai Wanita";
  const groom = preview.groomNickname || preview.groomName || "Mempelai Pria";

  return (
    <div className="relative">
      <p className="ob-mono mb-3 text-[10px] uppercase tracking-[0.22em] text-[var(--ob-ink-faint)]">
        Preview Undangan
      </p>
      <div
        className="relative overflow-hidden rounded-[18px] p-7 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] ring-1 ring-[var(--ob-line)] transition-[background] duration-500"
        style={{ background: palette.bg, color: palette.ink }}
      >
        <p
          className="ob-mono text-center text-[8px] uppercase tracking-[0.32em] opacity-60"
          style={{ color: palette.ink }}
        >
          The Wedding Of
        </p>
        <p
          className="mt-4 text-center text-[10px] tracking-[0.4em]"
          style={{ color: palette.accent, opacity: 0.7 }}
        >
          ✦ ⸻ ✦
        </p>
        <p
          className="ob-serif mt-3 text-center text-2xl font-light leading-tight"
          style={{ color: palette.ink }}
        >
          {bride}
        </p>
        <p
          className="ob-serif text-center text-2xl italic opacity-70"
          style={{ color: palette.ink }}
        >
          &
        </p>
        <p
          className="ob-serif text-center text-2xl font-light italic leading-tight"
          style={{ color: palette.ink }}
        >
          {groom}
        </p>
        <p
          className="ob-mono mt-5 text-center text-[9px] uppercase tracking-[0.28em] opacity-70"
          style={{ color: palette.ink }}
        >
          {formatDate(preview.eventDate)}
        </p>
        {preview.venue && (
          <p
            className="ob-mono mt-1 text-center text-[9px] tracking-[0.18em] opacity-60"
            style={{ color: palette.ink }}
          >
            {preview.venue}
          </p>
        )}
        <p
          className="ob-mono mt-5 text-center text-[8px] uppercase tracking-[0.32em] opacity-50"
          style={{ color: palette.accent }}
        >
          {palette.label}
        </p>
      </div>
    </div>
  );
}
