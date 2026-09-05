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
  /**
   * Groups the sibling decks of a deck set — the same content authored as ~40
   * decks, one per language. Non-null means this deck is in a set, and so has
   * no translations of its own: a learner's translation is the sibling deck's
   * card text at the same position, which makes re-translating a card a no-op.
   * Undefined against an API deployed before the field existed, so `!= null`
   * reads as "not in a set" there and the editor behaves as it did before.
   */
  variantsSetId?: string | null;
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

export type PlatformDeckVideoReplacementStatus =
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * One attempt to replace (or add) a published deck's video. Video needs
 * transcoding, so unlike the images and audio it is not a field on the deck
 * PATCH: the admin stages the upload, the API runs a transcoder job into a
 * fresh version directory, and the deck is only cut over once the output is
 * verified — a failed attempt leaves the live video untouched.
 */
export type PlatformDeckVideoReplacement = {
  id: string;
  deckId: string;
  status: PlatformDeckVideoReplacementStatus;
  videoSourcePath: string;
  targetVideoVersion: number;
  previousVideoVersion: number;
  errorCode: string | null;
  createdAt: string;
  completedAt: string | null;
  failedAt: string | null;
};

export type PlatformDeckVideoStatus = {
  deckId: string;
  hasVideo: boolean;
  videoVersion: number;
  firstVideoFrameUrl: string | null;
  /** Most recent attempt, or null if the deck's video has never been replaced. */
  replacement: PlatformDeckVideoReplacement | null;
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
