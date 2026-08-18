import type { DeckLevel } from "@/types/langs";

export type DeckSummary = {
  id: string;
  title: string;
  level: string;
  langId: string;
  horizontalImageUrl: string;
  verticalImageUrl: string;
  previewVideoUrl: string | null;
  forKids: boolean;
  createdAt: string;
  updatedAt: string;
  isFeatured: boolean;
  sortOrder: number;
  cardCount: number;
};

export type PaginatedDecks = {
  data: DeckSummary[];
  total: number;
  page: number;
  pageSize: number;
};

// --- Platform decks (published, creatorId IS NULL) ---

export type CardTranslationJobStatus = "processing" | "completed" | "failed";

/**
 * One run of "refresh this card's translations". A published deck fans out into
 * ~60 translation decks, so this runs in the background and the editor polls it.
 */
export type CardTranslationJob = {
  id: string;
  cardId: string;
  deckId: string;
  status: CardTranslationJobStatus;
  /** The card text this run translated — may already be stale. */
  sourceText: string;
  totalTargets: number;
  completedTargets: number;
  /**
   * Variants that couldn't be refreshed. The job still counts as completed —
   * a partial refresh beats none — and these can be retried on their own.
   */
  failedVariantCodes: string[];
  errorCode: string | null;
  createdAt: string;
  completedAt: string | null;
  failedAt: string | null;
};

export type PlatformDeckCard = {
  id: string;
  text: string;
  audioUrl: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  /**
   * Most recent translation refresh for this card, so reopening a deck mid-job
   * resumes polling instead of looking idle. `?? null` at the use site covers an
   * API deployed before card editing existed.
   */
  translationJob: CardTranslationJob | null;
};

export type PlatformDeck = {
  id: string;
  title: string;
  level: DeckLevel;
  langId: string;
  langVariantId: string;
  /** Human-usable variant code (e.g. "en-ca"); the id alone isn't displayable. */
  langVariantCode: string;
  horizontalImageUrl: string;
  verticalImageUrl: string;
  /** Reliable "has a video" signal — previewVideoUrl is never set for platform decks. */
  hasVideo: boolean;
  previewVideoUrl: string | null;
  firstVideoFrameUrl: string | null;
  audioUrl: string | null;
  forKids: boolean;
  url: string | null;
  amazonMusic: string | null;
  appleMusic: string | null;
  spotify: string | null;
  youtubeMusic: string | null;
  /** Free-form topical labels, lowercase, sorted alphabetically. */
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

/** One tag in use across platform decks, with how many decks carry it. */
export type DeckTagSummary = {
  tag: string;
  deckCount: number;
};

export type PlatformDeckWithCards = PlatformDeck & {
  cards: PlatformDeckCard[];
};

export type PlatformDeckSummary = PlatformDeck & {
  cardCount: number;
};

/** One collection a deck belongs to, with its per-inclusion visibility gate. */
export type DeckCollectionMembership = {
  collectionId: string;
  title: string;
  level: DeckLevel;
  langVariantId: string;
  langVariantCode: string;
  forKids: boolean;
  mature: boolean;
  published: boolean;
  sortOrder: number;
};

export type PaginatedPlatformDecks = {
  data: PlatformDeckSummary[];
  total: number;
  page: number;
  pageSize: number;
};

export type UpdatePlatformDeckInput = {
  title?: string;
  level?: DeckLevel;
  forKids?: boolean;
  url?: string;
  amazonMusic?: string;
  appleMusic?: string;
  spotify?: string;
  youtubeMusic?: string;
  /** Replaces the deck's whole tag set — send the full list, `[]` clears it. */
  tags?: string[];
  /** Mates-bucket path of a newly uploaded image; the API copies it to the CDN. */
  horizontalImageSourcePath?: string;
  verticalImageSourcePath?: string;
  firstVideoFrameSourcePath?: string;
  audioSourcePath?: string;
};

export type UpdatePlatformDeckCardInput = {
  text?: string;
  /** Mates-bucket path of a newly uploaded clip for this card. */
  audioSourcePath?: string;
  /**
   * Mates-bucket path of a new deck-level audio track. The track is one
   * continuous recording of every card, so replacing a card's clip leaves it
   * stale — the editor pairs the two, the API accepts them independently.
   */
  deckAudioSourcePath?: string;
  /** Regenerate this card's translations across every translation deck. */
  retranslate?: boolean;
};

export type PlatformDeckCardUpdateResult = {
  card: PlatformDeckCard;
  /** The deck's audio URL after the save — new if the track was replaced. */
  deckAudioUrl: string | null;
  translationJob: CardTranslationJob | null;
};
