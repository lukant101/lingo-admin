import type { DeckLevel } from "@/types/langs";

export type PlatformDeckDraftStatus =
  | "draft"
  | "processing_started"
  | "processing_completed"
  | "failed";

export type PlatformDeckDraftCard = {
  text: string;
  audioPath: string;
};

export type PlatformDeckDraftResponse = {
  id: string;
  title: string;
  collectionId: string;
  langVariantId: string;
  langId: string;
  level: DeckLevel;
  forKids: boolean;
  /**
   * Subscribers-only, carried into the deck's isPremium on publish. Unlike
   * level/forKids it is not inherited from the collection — the author sets it
   * while authoring. Undefined against an API deployed before the field.
   */
  isPremium?: boolean;
  status: PlatformDeckDraftStatus;
  uploadBasePath: string;
  horizontalImageSourcePath: string | null;
  verticalImageSourcePath: string | null;
  videoSourcePath: string | null;
  audioSourcePath: string | null;
  cards: PlatformDeckDraftCard[];
  /** Carried into the deck's tags on publish. */
  tags: string[];
  deckId: string | null;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedPlatformDeckDrafts = {
  data: PlatformDeckDraftResponse[];
  total: number;
  page: number;
  pageSize: number;
};
