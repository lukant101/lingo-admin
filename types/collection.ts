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
  /**
   * Read in order, like the chapters of a book: the learner feed shows only
   * the first published deck, and the rest are served from it, in the
   * collection's own order. Needs API 0.30.0.
   */
  isSeries: boolean;
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
  /**
   * Position within this collection. Only a series reads it — as the first
   * key of its order, ahead of `deckSortOrder` — and the feed does not.
   */
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
