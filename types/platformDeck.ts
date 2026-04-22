import type { DeckLevel } from "@/types/langs";

export type PlatformDeckDraftStatus =
  | "draft"
  | "publishing"
  | "published"
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
  status: PlatformDeckDraftStatus;
  uploadBasePath: string;
  horizontalImageSourcePath: string | null;
  verticalImageSourcePath: string | null;
  videoSourcePath: string | null;
  cards: PlatformDeckDraftCard[];
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
