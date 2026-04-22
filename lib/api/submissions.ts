import { apiGet, apiPatch } from "./client";
import type { StudioSettings } from "@/types/studio";
import type { DeckSummary, PaginatedDecks } from "@/types/deck";

type ListStudiosQuery = {
  langVariantCode?: string;
  sort?: "asc" | "desc";
};

/**
 * List all studios for the current creator
 */
export async function listStudios(
  query?: ListStudiosQuery
): Promise<StudioSettings[]> {
  const params = new URLSearchParams();
  if (query?.langVariantCode)
    params.set("langVariantCode", query.langVariantCode);
  if (query?.sort) params.set("sort", query.sort);
  const qs = params.toString();
  return apiGet<StudioSettings[]>(`/studios${qs ? `?${qs}` : ""}`);
}

/**
 * List decks for a studio
 */
export async function listDecks(studioId: string): Promise<PaginatedDecks> {
  return apiGet<PaginatedDecks>(`/studios/${studioId}/decks`);
}

/**
 * Update a deck (PATCH)
 */
export async function updateDeck(
  studioId: string,
  deckId: string,
  data: { isFeatured?: boolean }
): Promise<DeckSummary> {
  return apiPatch<DeckSummary>(`/studios/${studioId}/decks/${deckId}`, data);
}
