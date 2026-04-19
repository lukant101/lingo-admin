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

/**
 * API base URL - should be configured per environment
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://app.lingohouse.app";
