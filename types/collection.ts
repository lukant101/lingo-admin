import type { DeckLevel } from "@/types/langs";

export type CollectionResponse = {
  id: string;
  title: string;
  langVariantId: string;
  langId: string;
  level: DeckLevel;
  forKids: boolean;
  mature: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedCollections = {
  data: CollectionResponse[];
  total: number;
  page: number;
  pageSize: number;
};

export type CollectionDeckResponse = {
  collectionId: string;
  deckId: string;
  sortOrder: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CollectionDeckItem = {
  deckId: string;
  sortOrder: number;
  published: boolean;
  title: string;
};

export type CollectionWithDecksResponse = CollectionResponse & {
  decks: CollectionDeckItem[];
};
