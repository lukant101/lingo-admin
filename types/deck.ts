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

export type PlatformDeckCard = {
  id: string;
  text: string;
  audioUrl: string;
  position: number;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
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
  /** Mates-bucket path of a newly uploaded image; the API copies it to the CDN. */
  horizontalImageSourcePath?: string;
  verticalImageSourcePath?: string;
  firstVideoFrameSourcePath?: string;
  audioSourcePath?: string;
};
