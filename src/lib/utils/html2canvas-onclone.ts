/**
 * Shared `onclone` hook for html2canvas. Walks the cloned document and
 * pins every color/background/border-color to the resolved RGB string
 * the browser computed in the *live* document.
 *
 * Why this exists:
 * Tailwind v4 emits oklch() (and sometimes oklab()) for default color
 * utilities and `@theme`-derived tokens. html2canvas v1.4.1 cannot
 * parse those color functions and either fails or paints elements
 * black/white. The browser, however, has already resolved them to rgb
 * in `getComputedStyle()` — so the fix is to read computed styles
 * from the live element and copy them as inline styles onto the
 * cloned element before html2canvas paints.
 *
 * Mirroring the live element (instead of the cloned one) is key:
 * `clonedDoc.querySelectorAll('*')` returns nodes whose computed
 * styles haven't run through layout yet, and inheriting via the
 * cloned style sheets re-introduces the same oklch problem.
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
  "boxShadow",
  "textShadow",
  // backgroundImage carries linear-gradient with oklch stops too
  "backgroundImage",
] as const;

export function buildOnClone(rootLive: HTMLElement) {
  return function onClone(clonedDoc: Document, clonedRoot: HTMLElement) {
    const liveAll = rootLive.querySelectorAll<HTMLElement>("*");
    const cloneAll = clonedRoot.querySelectorAll<HTMLElement>("*");

    // Pin styles on the root itself first.
    pinStyles(rootLive, clonedRoot);

    // Walk in lockstep — both trees were cloned from the same source
    // so node order is identical.
    const len = Math.min(liveAll.length, cloneAll.length);
    for (let i = 0; i < len; i++) {
      pinStyles(liveAll[i], cloneAll[i]);
    }

    // Note: we leave the cloned <style> tags alone. The pin pass above
    // already overrode color-related declarations with inline rgb, so
    // even if Tailwind's sheets inject oklch, our inline values win
    // by specificity.
    void clonedDoc;
  };
}

function pinStyles(live: HTMLElement, clone: HTMLElement) {
  const computed = getComputedStyle(live);
  for (const prop of COLOR_PROPS) {
    const value = computed[prop as keyof CSSStyleDeclaration] as
      | string
      | undefined;
    if (!value) continue;
    // Skip "none" / empty / fully-transparent unless the live element
    // actually intends them. Setting them explicitly is a no-op so
    // there's no harm in always copying.
    try {
      // backgroundImage with `none` is fine to copy verbatim.
      (clone.style as unknown as Record<string, string>)[prop] = value;
    } catch {
      // Some computed values aren't assignable (rare, e.g. fill on
      // non-SVG); ignore.
    }
  }
}
