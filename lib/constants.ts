export const DECK_LEVEL = {
  A1: "A1",
  A2: "A2",
  B1: "B1",
  B2: "B2",
  C1: "C1",
  C2: "C2",
} as const;

/**
 * Array of all valid CEFR levels in order
 */
export const DECK_LEVELS = [
  DECK_LEVEL.A1,
  DECK_LEVEL.A2,
  DECK_LEVEL.B1,
  DECK_LEVEL.B2,
  DECK_LEVEL.C1,
  DECK_LEVEL.C2,
] as const;

/**
 * Check if a string is a valid CEFR level
 */
export const isValidLevel = (level: string): boolean => {
  return Object.values(DECK_LEVEL).includes(
    level as (typeof DECK_LEVEL)[keyof typeof DECK_LEVEL]
  );
};

export const DIALOG_MAX_WIDTH = 560;

/** The API's "not yet placed" deck sort order — sorts a deck after every other. */
export const DECK_SORT_ORDER_UNPLACED = 999_999_999;

export const DECK_SORT_ORDER_HINT =
  "Learners see decks in ascending sort order, from 1 to 999999999: lower numbers are shown first, and 999999999 puts a deck at the end.";

/**
 * API base URL - should be configured per environment
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://app.lingohouse.app";
