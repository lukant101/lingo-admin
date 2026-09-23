import type { DeckLevel } from "@/types/langs";

export type CollectionResponse = {
  id: string;
  title: string;
  langVariantId: string;
  langId: string;
  level: DeckLevel;
  forKids: boolean;
  mature: boolean;
  /** Learner visibility for the whole collection. */
  published: boolean;
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
  createdAt: string;
  updatedAt: string;
};

export type CollectionDeckItem = {
  deckId: string;
  /** Position within this collection. Not used by the learner feed. */
  sortOrder: number;
  /**
   * The deck's own sort order — what the learner feed orders by. Undefined
   * against an API deployed before the field existed.
   */
  deckSortOrder?: number;
  /** The deck's own published flag — visibility is not per inclusion. */
  published: boolean;
  title: string;
};

export type CollectionWithDecksResponse = CollectionResponse & {
  decks: CollectionDeckItem[];
};
