import { apiGet, apiPatch } from "./client";
import type { DeckLevel } from "@/types/langs";
import type {
  DeckCollectionMembership,
  PaginatedPlatformDecks,
  PlatformDeckWithCards,
  UpdatePlatformDeckInput,
} from "@/types/deck";

export type ListPlatformDecksQuery = {
  langVariantCode?: string;
  level?: DeckLevel;
  forKids?: boolean;
  /** Case-insensitive substring match on the deck title. */
  search?: string;
  page?: number;
  pageSize?: number;
};

export async function listPlatformDecks(
  query: ListPlatformDecksQuery = {}
): Promise<PaginatedPlatformDecks> {
  const params: Record<string, string> = {};
  if (query.langVariantCode) params.langVariantCode = query.langVariantCode;
  if (query.level) params.level = query.level;
  if (query.forKids != null) params.forKids = String(query.forKids);
  if (query.search?.trim()) params.search = query.search.trim();
  if (query.page != null) params.page = String(query.page);
  if (query.pageSize != null) params.pageSize = String(query.pageSize);
  return apiGet<PaginatedPlatformDecks>(
    "/admin/decks",
    Object.keys(params).length > 0 ? params : undefined
  );
}

export async function getPlatformDeck(
  deckId: string
): Promise<PlatformDeckWithCards> {
  return apiGet<PlatformDeckWithCards>(`/admin/decks/${deckId}`);
}

/** Collections this deck belongs to — the reverse of GET /admin/collections/:id. */
export async function listPlatformDeckCollections(
  deckId: string
): Promise<DeckCollectionMembership[]> {
  return apiGet<DeckCollectionMembership[]>(
    `/admin/decks/${deckId}/collections`
  );
}

export async function updatePlatformDeck(
  deckId: string,
  input: UpdatePlatformDeckInput
): Promise<PlatformDeckWithCards> {
  const payload: Record<string, unknown> = { ...input };
  if (typeof payload.title === "string") {
    payload.title = (payload.title as string).trim();
    if (!payload.title) delete payload.title;
  }
  return apiPatch<PlatformDeckWithCards>(`/admin/decks/${deckId}`, payload);
}
