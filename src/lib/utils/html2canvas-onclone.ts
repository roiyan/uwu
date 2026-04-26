/**
 * Shared `onclone` hook for html2canvas. Walks the cloned document and
 * pins every color/background/border-color to a canonical rgb string
 * the html2canvas parser can actually consume.
 *
 * Why this exists:
 * Tailwind v4 emits oklch() (and sometimes oklab()) for default color
 * utilities and `@theme`-derived tokens. html2canvas v1.4.1 cannot
 * parse those color functions — it either fails outright or paints
 * affected elements black/white.
 *
 * The non-obvious part the previous version missed:
 * `getComputedStyle()` returns colors in their *declared* form. If
 * the rule is `color: oklch(...)`, the computed string is still
 * `oklch(...)` — modern browsers preserve the authoring form for
 * serialization. They only convert to RGB when actually painting
 * pixels. So copying computed styles inline (the previous fix)
 * didn't actually convert anything.
 *
 * The real fix: pipe each color through a hidden canvas's 2D context.
 * The canvas spec mandates that setting `ctx.fillStyle` parses the
 * input (browser supports oklch/oklab via CSS Color 4) and reading
 * it back returns the canonical form (`#rrggbb` or `rgba(...)`). We
 * resolve every color-bearing computed style on every node and
 * rewrite it inline so html2canvas only ever sees rgb.
 *
 * Color-containing properties (`background-image: linear-gradient(...)`,
 * `box-shadow: ... oklch(...)`, etc.) are pattern-matched and have
 * just the offending color tokens replaced.
 */

const COLOR_PROPS = [
  "color",
  "backgroundColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "fill",
  "stroke",
  "caretColor",
  "textDecorationColor",
] as const;

const COLOR_CONTAINING_PROPS = [
  "backgroundImage",
  "boxShadow",
  "textShadow",
] as const;

// oklch(0.5 0.1 30 / 0.5), oklab(...), lab(...), lch(...). No nested
// parens used by these color functions, so a flat `[^)]*` is enough.
const MODERN_COLOR_REGEX = /(oklch|oklab|lab|lch)\([^)]*\)/gi;

function makeResolver(): (input: string) => string {
  // One canvas reused for every color resolution in a single export
  // pass. Cheap to keep alive; freed when the closure is gc'd.
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  const cache = new Map<string, string>();

  return function resolve(input: string): string {
    if (!input) return input;
    const cached = cache.get(input);
    if (cached !== undefined) return cached;
    if (!ctx) {
      cache.set(input, input);
      return input;
    }

    // Reset to a known sentinel so a parse failure doesn't leak the
    // previous fillStyle into our return.
    ctx.fillStyle = "#000000";
    try {
      ctx.fillStyle = input;
    } catch {
      // Some browsers throw on invalid color strings — fall through
      // and return the original.
      cache.set(input, input);
      return input;
    }
    const out = String(ctx.fillStyle);
    cache.set(input, out);
    return out;
  };
}

function rewriteContaining(
  value: string,
  resolve: (s: string) => string,
): string {
  if (!value || value === "none") return value;
  // Reset before any test/replace because the regex has /g.
  MODERN_COLOR_REGEX.lastIndex = 0;
  if (!MODERN_COLOR_REGEX.test(value)) {
    MODERN_COLOR_REGEX.lastIndex = 0;
    return value;
  }
  MODERN_COLOR_REGEX.lastIndex = 0;
  return value.replace(MODERN_COLOR_REGEX, (token) => resolve(token));
}

export function buildOnClone(rootLive: HTMLElement) {
  return function onClone(clonedDoc: Document, clonedRoot: HTMLElement) {
    const resolve = makeResolver();
    const liveAll = rootLive.querySelectorAll<HTMLElement>("*");
    const cloneAll = clonedRoot.querySelectorAll<HTMLElement>("*");

    pinStyles(rootLive, clonedRoot, resolve);

    const len = Math.min(liveAll.length, cloneAll.length);
    for (let i = 0; i < len; i++) {
      pinStyles(liveAll[i], cloneAll[i], resolve);
    }

    // Strip every <style>/<link rel="stylesheet"> from the cloned
    // document. With every visible color already pinned inline above,
    // the cloned doc no longer needs the original stylesheets — but if
    // we leave them in, html2canvas's own CSS parser walks them and
    // logs "Attempting to parse an unsupported color function 'oklab'"
    // for every Tailwind v4 oklch() rule it encounters. Removing the
    // sheets before the canvas pass silences those warnings entirely.
    const sheets = clonedDoc.querySelectorAll(
      'style, link[rel="stylesheet"]',
    );
    sheets.forEach((s) => s.remove());
  };
}

function pinStyles(
  live: HTMLElement,
  clone: HTMLElement,
  resolve: (s: string) => string,
) {
  const computed = getComputedStyle(live);

  for (const prop of COLOR_PROPS) {
    const value = computed[prop as keyof CSSStyleDeclaration] as
      | string
      | undefined;
    if (!value) continue;
    const resolved = resolve(value);
    // Always pin inline — even when resolved equals input. The inline
    // declaration wins specificity over any cascade rule the cloned
    // doc might still apply, which is the safety net we want.
    try {
      (clone.style as unknown as Record<string, string>)[prop] = resolved;
    } catch {
      // Some computed values aren't assignable on certain element
      // types (rare, e.g. fill on non-SVG); ignore.
    }
  }

  for (const prop of COLOR_CONTAINING_PROPS) {
    const value = computed[prop as keyof CSSStyleDeclaration] as
      | string
      | undefined;
    if (!value) continue;
    const rewritten = rewriteContaining(value, resolve);
    if (rewritten !== value) {
      try {
        (clone.style as unknown as Record<string, string>)[prop] = rewritten;
      } catch {
        // ignore
      }
    }
  }
}
