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
 */

export const SECTION_IDS = [
  "mempelai",
  "foto-sampul",
  "kutipan",
  "cerita",
  "acara",
  "countdown",
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
 * Render order used when no override is set. NB: this differs from
 * the editor's section-list order — the left-rail list intentionally
 * puts "Mempelai" at slot 01 because that's the first thing the couple
 * cares about editing, while the actual invitation opens with the
 * cover photo.
 */
export const DEFAULT_SECTION_ORDER: readonly SectionId[] = [
  "foto-sampul",
  "kutipan",
  "mempelai",
  "cerita",
  "acara",
  "countdown",
  "galeri",
  "rsvp",
  "amplop",
] as const;

/**
 * Resolve the active section order for an event:
 *
 *   1. Project the override onto the canonical set, deduping and
 *      filtering unknown IDs.
 *   2. Append any canonical IDs the override didn't mention so a
 *      schema migration that adds a new section keeps rendering it
 *      for events whose stored order predates the new ID.
 *   3. Fall back to `DEFAULT_SECTION_ORDER` when the override is
 *      missing or yields nothing.
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
  for (const id of DEFAULT_SECTION_ORDER) {
    if (!seen.has(id)) ordered.push(id);
  }
  return ordered;
}

/** Project a candidate array onto a clean permutation. Used at the
 *  action layer before persistence so we never write malformed data. */
export function normaliseSectionOrder(input: unknown): SectionId[] {
  return [...resolveSectionOrder(input)];
}
