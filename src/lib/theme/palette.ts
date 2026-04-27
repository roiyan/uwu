import type { Palette6Input } from "@/lib/schemas/event";

/**
 * Six-slot palette used by the Website Editor's color customisation
 * feature. The legacy 3-color theme palette ({primary, secondary,
 * accent}) is kept as the canonical render input — the 6-color
 * palette is the richer authoring vocabulary, and we derive a
 * legacy-compatible 3-color palette from it on save.
 *
 * The mapping (legacy ← rich):
 *   primary   ← brandPrimary
 *   secondary ← background
 *   accent    ← brandLight
 *
 * That keeps existing invitation renderers working unchanged while the
 * couple sees their full palette respected.
 */
export type Palette6 = Required<Palette6Input>;

export type Palette3 = {
  primary: string;
  secondary: string;
  accent: string;
};

/**
 * Curated default palettes per known theme slug. Themes not in this
 * map fall through to `FALLBACK_PALETTE6`, which mirrors the warm
 * ivory palette the existing 3-color defaults use.
 */
const PER_THEME_DEFAULTS: Record<string, Palette6> = {
  "rose-gold-luxe": {
    background: "#FFFBF7",
    headingText: "#2C2C3A",
    bodyText: "#5A5A6A",
    brandPrimary: "#B89DD4",
    brandLight: "#F5E6E0",
    brandDark: "#3A2A2A",
  },
  "navy-elegance": {
    background: "#F4F6FB",
    headingText: "#16203B",
    bodyText: "#3A4660",
    brandPrimary: "#3D5A8A",
    brandLight: "#DCE4F2",
    brandDark: "#0E1830",
  },
  "sakura-dreams": {
    background: "#FAF6F1",
    headingText: "#1A1A2E",
    bodyText: "#5A5A6A",
    brandPrimary: "#E8A0A0",
    brandLight: "#FCE8E2",
    brandDark: "#3A2A2A",
  },
  "midnight-garden": {
    background: "#06060B",
    headingText: "#EDE8DE",
    bodyText: "#9E9A95",
    brandPrimary: "#8FA3D9",
    brandLight: "#1A1A2E",
    brandDark: "#04040A",
  },
};

export const FALLBACK_PALETTE6: Palette6 = {
  background: "#FAF6F1",
  headingText: "#1A1A2E",
  bodyText: "#5A5A6A",
  brandPrimary: "#C06070",
  brandLight: "#F5E6E0",
  brandDark: "#3A2A2A",
};

/**
 * Resolve the default 6-color palette for a given theme, preferring an
 * explicit `palette6` on the theme's JSON config, then a curated
 * per-theme fallback by slug, and finally the universal fallback.
 */
export function defaultPalette6For(
  themeSlug: string | null | undefined,
  themeConfig: Record<string, unknown> | null | undefined,
): Palette6 {
  const fromConfig = themeConfig?.palette6 as Partial<Palette6> | undefined;
  const fromSlug = themeSlug ? PER_THEME_DEFAULTS[themeSlug] : undefined;
  const base = fromSlug ?? FALLBACK_PALETTE6;
  if (!fromConfig) return base;
  return {
    background: fromConfig.background ?? base.background,
    headingText: fromConfig.headingText ?? base.headingText,
    bodyText: fromConfig.bodyText ?? base.bodyText,
    brandPrimary: fromConfig.brandPrimary ?? base.brandPrimary,
    brandLight: fromConfig.brandLight ?? base.brandLight,
    brandDark: fromConfig.brandDark ?? base.brandDark,
  };
}

/**
 * Merge a partial 6-color override on top of a base palette so
 * unsaved slots fall back to theme defaults.
 */
export function mergePalette6(
  base: Palette6,
  override: Partial<Palette6> | null | undefined,
): Palette6 {
  if (!override) return base;
  return {
    background: override.background ?? base.background,
    headingText: override.headingText ?? base.headingText,
    bodyText: override.bodyText ?? base.bodyText,
    brandPrimary: override.brandPrimary ?? base.brandPrimary,
    brandLight: override.brandLight ?? base.brandLight,
    brandDark: override.brandDark ?? base.brandDark,
  };
}

/**
 * Project the rich 6-color palette into the legacy 3-color shape the
 * existing invitation renderer + Preview consume. Persist BOTH so
 * older read paths keep working and the new authoring vocabulary stays
 * authoritative.
 */
export function deriveLegacyPalette(p: Palette6): Palette3 {
  return {
    primary: p.brandPrimary,
    secondary: p.background,
    accent: p.brandLight,
  };
}
