/**
 * Curated Google Fonts catalog used by the Website Editor's font
 * picker. The taxonomy controls which fonts can sit in which slot:
 *   • `heading`  — Serif + Script (premium feel for couple names)
 *   • `body`     — Serif + Sans (legible paragraph copy; Script
 *                  excluded so a swirly script never lands on RSVP
 *                  detail text)
 *
 * The strict allow-list lives next to this catalog (`isAllowedFont`)
 * and is enforced at the action layer so a crafted form submission
 * can't sneak an arbitrary `font-family` past Zod and into the
 * invitation `<link>` tag.
 *
 * To add a new font:
 *   1. Add it to the appropriate group below.
 *   2. The invitation page injects a single Google Fonts <link> tag
 *      based on the user's selected pair — no global import is needed.
 */

export type FontCategory = "Serif" | "Sans" | "Script";

export type FontOption = {
  /** Used both as the CSS `font-family` token and as the value
   *  persisted in `eventThemeConfigs.config.fonts.{heading,body}`. */
  value: string;
  label: string;
  /** Per-font weight axes the public invitation requests. Kept
   *  intentionally light to preserve LCP. */
  weights: number[];
};

export const FONT_OPTIONS: Record<FontCategory, FontOption[]> = {
  Serif: [
    { value: "Cormorant Garamond", label: "Cormorant Garamond", weights: [300, 400, 500, 600] },
    { value: "Playfair Display", label: "Playfair Display", weights: [400, 500, 600] },
    { value: "Fraunces", label: "Fraunces", weights: [200, 300, 400, 500] },
    { value: "EB Garamond", label: "EB Garamond", weights: [400, 500] },
    { value: "Libre Baskerville", label: "Libre Baskerville", weights: [400, 700] },
    { value: "DM Serif Display", label: "DM Serif Display", weights: [400] },
    { value: "Crimson Pro", label: "Crimson Pro", weights: [300, 400, 500] },
    { value: "Lora", label: "Lora", weights: [400, 500, 600] },
  ],
  Sans: [
    { value: "Outfit", label: "Outfit", weights: [300, 400, 500] },
    { value: "Inter", label: "Inter", weights: [300, 400, 500] },
    { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans", weights: [300, 400, 500] },
    { value: "Poppins", label: "Poppins", weights: [300, 400, 500] },
    { value: "Montserrat", label: "Montserrat", weights: [300, 400, 500] },
    { value: "DM Sans", label: "DM Sans", weights: [300, 400, 500] },
  ],
  Script: [
    { value: "Great Vibes", label: "Great Vibes", weights: [400] },
    { value: "Dancing Script", label: "Dancing Script", weights: [400, 500] },
    { value: "Pinyon Script", label: "Pinyon Script", weights: [400] },
    { value: "Alex Brush", label: "Alex Brush", weights: [400] },
  ],
};

export type ThemeFonts = {
  heading: string;
  body: string;
};

/** Defaults mirror the historic invitation typography so existing
 *  events render unchanged after the schema extension. */
export const DEFAULT_FONTS: ThemeFonts = {
  heading: "Cormorant Garamond",
  body: "Outfit",
};

const ALL_FONT_VALUES: ReadonlySet<string> = new Set(
  [...FONT_OPTIONS.Serif, ...FONT_OPTIONS.Sans, ...FONT_OPTIONS.Script].map(
    (f) => f.value,
  ),
);

/** Heading slot accepts Serif + Script; body accepts Serif + Sans. */
const HEADING_VALUES: ReadonlySet<string> = new Set(
  [...FONT_OPTIONS.Serif, ...FONT_OPTIONS.Script].map((f) => f.value),
);
const BODY_VALUES: ReadonlySet<string> = new Set(
  [...FONT_OPTIONS.Serif, ...FONT_OPTIONS.Sans].map((f) => f.value),
);

export function isAllowedHeadingFont(name: unknown): name is string {
  return typeof name === "string" && HEADING_VALUES.has(name);
}

export function isAllowedBodyFont(name: unknown): name is string {
  return typeof name === "string" && BODY_VALUES.has(name);
}

/** Looks up a font's metadata across all categories. */
export function findFont(name: string): FontOption | undefined {
  return [
    ...FONT_OPTIONS.Serif,
    ...FONT_OPTIONS.Sans,
    ...FONT_OPTIONS.Script,
  ].find((f) => f.value === name);
}

/**
 * Resolve the active font pair for an event. Falls back to theme
 * defaults, then the universal default. Unknown font names (e.g. an
 * old override that referenced a since-removed font) are dropped with
 * the silent fallback so the invitation never serves a broken
 * `font-family`.
 */
export function resolveFonts(
  themeConfig: Record<string, unknown> | null | undefined,
  override: Record<string, unknown> | null | undefined,
): ThemeFonts {
  const themeFonts = (themeConfig?.fonts ?? {}) as Partial<ThemeFonts>;
  const overrideFonts = (override?.fonts ?? {}) as Partial<ThemeFonts>;
  const heading = pickFromAll(
    overrideFonts.heading,
    themeFonts.heading,
    DEFAULT_FONTS.heading,
  );
  const body = pickFromAll(
    overrideFonts.body,
    themeFonts.body,
    DEFAULT_FONTS.body,
  );
  return { heading, body };
}

function pickFromAll(...candidates: Array<string | undefined>): string {
  for (const c of candidates) {
    if (typeof c === "string" && ALL_FONT_VALUES.has(c)) return c;
  }
  return DEFAULT_FONTS.heading;
}

/**
 * Build a single Google Fonts <link href=…> covering the heading +
 * body pair. One CSS request per page keeps the LCP-blocking fetch
 * count to 1. When heading == body we de-duplicate the family clause.
 */
export function googleFontsHref(fonts: ThemeFonts): string {
  const family = (name: string, weights: number[]) =>
    `family=${encodeURIComponent(name).replace(/%20/g, "+")}:wght@${weights.join(";")}`;
  const heading = findFont(fonts.heading);
  const body = findFont(fonts.body);
  const parts: string[] = [];
  if (heading) parts.push(family(heading.value, heading.weights));
  if (body && body.value !== fonts.heading) {
    parts.push(family(body.value, body.weights));
  }
  return `https://fonts.googleapis.com/css2?${parts.join("&")}&display=swap`;
}

/**
 * URL covering the entire catalog at light weights. Used by the
 * editor only so every dropdown option previews in its own typeface
 * without each select firing a separate stylesheet load.
 */
export function googleFontsCatalogHref(): string {
  const all = [
    ...FONT_OPTIONS.Serif,
    ...FONT_OPTIONS.Sans,
    ...FONT_OPTIONS.Script,
  ];
  const families = all
    .map((f) =>
      `family=${encodeURIComponent(f.value).replace(/%20/g, "+")}:wght@400`,
    )
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
