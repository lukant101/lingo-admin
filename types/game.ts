import type { DeckLevel } from "@/types/langs";

export type VoiceGender = "female" | "male";

// All 30 Gemini prebuilt TTS voices. The games backend runs a native-audio
// Live model, which supports every TTS voice. Genders per
// https://docs.cloud.google.com/text-to-speech/docs/gemini-tts, styles per
// https://ai.google.dev/gemini-api/docs/speech-generation.
export const GEMINI_VOICES = [
  { name: "Achernar", gender: "female", style: "Soft" },
  { name: "Aoede", gender: "female", style: "Breezy" },
  { name: "Autonoe", gender: "female", style: "Bright" },
  { name: "Callirrhoe", gender: "female", style: "Easy-going" },
  { name: "Despina", gender: "female", style: "Smooth" },
  { name: "Erinome", gender: "female", style: "Clear" },
  { name: "Gacrux", gender: "female", style: "Mature" },
  { name: "Kore", gender: "female", style: "Firm" },
  { name: "Laomedeia", gender: "female", style: "Upbeat" },
  { name: "Leda", gender: "female", style: "Youthful" },
  { name: "Pulcherrima", gender: "female", style: "Forward" },
  { name: "Sulafat", gender: "female", style: "Warm" },
  { name: "Vindemiatrix", gender: "female", style: "Gentle" },
  { name: "Zephyr", gender: "female", style: "Bright" },
  { name: "Achird", gender: "male", style: "Friendly" },
  { name: "Algenib", gender: "male", style: "Gravelly" },
  { name: "Algieba", gender: "male", style: "Smooth" },
  { name: "Alnilam", gender: "male", style: "Firm" },
  { name: "Charon", gender: "male", style: "Informative" },
  { name: "Enceladus", gender: "male", style: "Breathy" },
  { name: "Fenrir", gender: "male", style: "Excitable" },
  { name: "Iapetus", gender: "male", style: "Clear" },
  { name: "Orus", gender: "male", style: "Firm" },
  { name: "Puck", gender: "male", style: "Upbeat" },
  { name: "Rasalgethi", gender: "male", style: "Informative" },
  { name: "Sadachbia", gender: "male", style: "Lively" },
  { name: "Sadaltager", gender: "male", style: "Knowledgeable" },
  { name: "Schedar", gender: "male", style: "Even" },
  { name: "Umbriel", gender: "male", style: "Easy-going" },
  { name: "Zubenelgenubi", gender: "male", style: "Casual" },
] as const;

export type GeminiVoice = (typeof GEMINI_VOICES)[number]["name"];

// --- Published games (admin/games) ---

/** Setting/challenge translations keyed by target language-variant code
 * (currently 'en-ca', or 'es-419' for English games). */
export type GameTranslations = Record<
  string,
  { setting: string; challenge: string }
>;

export type GameIntroTranslations = Record<string, string>;

export type AdminGameCharacter = {
  id: string;
  gameId: string;
  slug: string;
  name: string;
  imageUrl: string;
  intro: string;
  introTranslations: GameIntroTranslations;
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
  translations: GameTranslations;
  verticalImageUrl: string;
  isPublished: boolean;
  sortOrder: number | null;
  /** Version of the authoring games.db content this row was last pushed from;
   * null for rows created before content versioning existed. */
  contentVersion: number | null;
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
  contentVersion?: number;
  characters?: GameCharacterInput[];
  /** When false, edited setting/challenge/intro texts keep their existing
   * translations (e.g. a typo fix). Defaults to true on the server. */
  regenerateTranslations?: boolean;
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
  /** Version of the authoring games.db content this draft represents; copied
   * onto the game at publish. Defaults to 1 server-side. */
  contentVersion: number;
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
  contentVersion?: number;
  verticalImageSourcePath?: string;
  characters?: GameDraftCharacter[];
};

export type PaginatedGameDrafts = {
  data: GameDraftResponse[];
  total: number;
  page: number;
  pageSize: number;
};
