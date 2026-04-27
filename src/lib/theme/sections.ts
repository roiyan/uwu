/**
 * Canonical list of invitation section IDs and the default render
 * order. The Website Editor's section reorder feature persists a
 * permutation of this set in `eventThemeConfigs.config.sectionOrder`;
 * the public invitation reads it back to choose render order.
 *
 * The default order below mirrors what the public invitation rendered
 * before the reorder feature shipped, so events without an override
 * keep rendering identically:
 *
 *   foto-sampul → kutipan → mempelai → cerita → acara → galeri →
 *   rsvp → amplop
 *
 * Extending: add the new ID to `SECTION_IDS`, append to
 * `DEFAULT_SECTION_ORDER` (or insert at the right index), and wire the
 * matching component into the invitation render switch.
 */

export const SECTION_IDS = [
  "mempelai",
  "foto-sampul",
  "kutipan",
  "cerita",
  "acara",
  "galeri",
  "rsvp",
  "amplop",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

const SECTION_ID_SET: ReadonlySet<string> = new Set(SECTION_IDS);

export function isSectionId(value: unknown): value is SectionId {
  return typeof value === "string" && SECTION_ID_SET.has(value);
}

/**
 * Render order used when no override is set. NB: this is *render*
 * order, which differs from the editor's section-list order — the
 * left-rail list intentionally puts "Mempelai" at slot 01 because
 * that's the first thing the couple cares about editing, while the
 * actual invitation opens with the cover photo.
 */
export const DEFAULT_SECTION_ORDER: readonly SectionId[] = [
  "foto-sampul",
  "kutipan",
  "mempelai",
  "cerita",
  "acara",
  "galeri",
  "rsvp",
  "amplop",
] as const;

/**
 * Resolve the active section order for an event.
 *
 *   1. If the override is a valid permutation/subset, dedupe against
 *      the canonical set and append any missing IDs at their default
 *      positions (so a future schema migration that adds a new
 *      section doesn't render an event without it).
 *   2. Otherwise fall back to the default order.
 *
 * The "append missing" rule is what lets us add new sections safely:
 * existing events whose stored order predates the new section still
 * render the new section in the right place, instead of silently
 * dropping it.
 */
export function resolveSectionOrder(
  override: unknown,
): readonly SectionId[] {
  if (!Array.isArray(override)) return DEFAULT_SECTION_ORDER;
  const seen = new Set<SectionId>();
  const ordered: SectionId[] = [];
  for (const raw of override) {
    if (isSectionId(raw) && !seen.has(raw)) {
      seen.add(raw);
      ordered.push(raw);
    }
  }
  if (ordered.length === 0) return DEFAULT_SECTION_ORDER;
  // Append any canonical IDs the override didn't mention, preserving
  // their default-order positions relative to one another.
  for (const id of DEFAULT_SECTION_ORDER) {
    if (!seen.has(id)) ordered.push(id);
  }
  return ordered;
}

/**
 * Reverse of `resolveSectionOrder`: take a candidate array (possibly
 * dirty) and project it onto a clean permutation. Used at the action
 * layer before persistence so we never write a malformed sectionOrder.
 */
export function normaliseSectionOrder(input: unknown): SectionId[] {
  return [...resolveSectionOrder(input)];
}
