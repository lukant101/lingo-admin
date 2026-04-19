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
