import type { DeckLevel } from "@/types/langs";

// Gemini prebuilt TTS voices offered for game characters.
export const GEMINI_VOICES = [
  "Kore",
  "Puck",
  "Charon",
  "Fenrir",
  "Aoede",
  "Leda",
  "Orus",
  "Zephyr",
] as const;

export type GeminiVoice = (typeof GEMINI_VOICES)[number];

// --- Published games (admin/games) ---

export type AdminGameCharacter = {
  id: string;
  gameId: string;
  slug: string;
  name: string;
  imageUrl: string;
  intro: string;
  voiceName: string;
  systemPrompt: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminGame = {
  id: string;
  langId: string;
  langVariantId: string;
  langCode: string;
  langVariantCode: string;
  level: DeckLevel;
  forKids: boolean;
  title: string;
  setting: string;
  challenge: string;
  accomplishment: string;
  verticalImageUrl: string;
  isPublished: boolean;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
};

export type GameWithCharacters = AdminGame & {
  characters: AdminGameCharacter[];
};

export type GameCharacterInput = {
  slug: string;
  name: string;
  imageUrl: string;
  /** Mates-bucket path of a newly uploaded image; the API copies it to the
   * CDN and overwrites imageUrl. */
  imageSourcePath?: string;
  intro?: string;
  voiceName?: string;
  systemPrompt: string;
  position: number;
};

export type UpdateGameInput = {
  level?: DeckLevel;
  title?: string;
  setting?: string;
  challenge?: string;
  accomplishment?: string;
  verticalImageUrl?: string;
  /** Mates-bucket path of a newly uploaded cover image; the API copies it to
   * the CDN and overwrites verticalImageUrl. */
  verticalImageSourcePath?: string;
  forKids?: boolean;
  isPublished?: boolean;
  sortOrder?: number;
  characters?: GameCharacterInput[];
};

export type PaginatedGames = {
  data: AdminGame[];
  total: number;
  page: number;
  pageSize: number;
};

// --- Game drafts (admin/game-drafts) ---

export type GameDraftStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "approved"
  | "rejected"
  | "cancelled"
  | "processing_started"
  | "processing_completed"
  | "failed";

// Character position is the array index; index 0 is the entry character.
export type GameDraftCharacter = {
  slug: string;
  name: string;
  imageSourcePath: string | null;
  intro: string;
  voiceName: string;
  systemPrompt: string;
};

export type GameDraftResponse = {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  status: GameDraftStatus;
  platformGames: boolean;
  langId: string;
  langVariantId: string;
  langCode: string;
  langVariantCode: string;
  level: DeckLevel;
  forKids: boolean;
  title: string;
  setting: string;
  challenge: string;
  accomplishment: string;
  sortOrder: number | null;
  verticalImageSourcePath: string | null;
  characters: GameDraftCharacter[];
  gameId: string | null;
  errorCode: string | null;
  uploadBasePath: string;
};

export type CreateGameDraftInput = {
  title: string;
  langVariantCode: string;
  level: DeckLevel;
};

export type UpdateGameDraftInput = {
  title?: string;
  level?: DeckLevel;
  setting?: string;
  challenge?: string;
  accomplishment?: string;
  forKids?: boolean;
  sortOrder?: number;
  verticalImageSourcePath?: string;
  characters?: GameDraftCharacter[];
};

export type PaginatedGameDrafts = {
  data: GameDraftResponse[];
  total: number;
  page: number;
  pageSize: number;
};
