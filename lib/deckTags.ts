/**
 * Client-side mirror of the API's tag rules (`src/common/utils/deck-tags.ts`).
 * The API normalises and validates again — this exists so a typo is caught in
 * the field instead of coming back as a 400 after a save.
 */
export const MAX_TAGS_PER_DECK = 20;
export const MAX_TAG_LENGTH = 50;

/** Lowercase letters (any script), digits, spaces, hyphens and apostrophes. */
const TAG_PATTERN = /^[\p{Ll}\p{N}][\p{Ll}\p{N} '-]*$/u;

/** Trims, lowercases and collapses inner whitespace. */
export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Null when the normalised tag is storable, otherwise the reason it isn't. */
export function validateTag(tag: string): string | null {
  if (!tag) return "Tag is empty";
  if (tag.length > MAX_TAG_LENGTH)
    return `Tag is longer than ${MAX_TAG_LENGTH} characters`;
  if (!TAG_PATTERN.test(tag))
    return "Use letters, digits, spaces, hyphens or apostrophes only";
  return null;
}
