import { apiDelete, apiGet, apiPatch, apiPost } from "./client";
import type { DeckLevel } from "@/types/langs";
import type {
  DeckCollectionMembership,
  DeckTagSummary,
  PaginatedPlatformDecks,
  PlatformDeckVideoReplacement,
  PlatformDeckVideoStatus,
  PlatformDeckWithCards,
  UpdatePlatformDeckInput,
} from "@/types/deck";

export type ListPlatformDecksQuery = {
  langVariantCode?: string;
  level?: DeckLevel;
  forKids?: boolean;
  isPremium?: boolean;
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
  if (query.isPremium != null) params.isPremium = String(query.isPremium);
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

/**
 * Every tag already in use, most-used first. Tags are free-form, so this is
 * what keeps the picker from breeding near-duplicates of the same label.
 */
export async function listDeckTags(): Promise<DeckTagSummary[]> {
  return apiGet<DeckTagSummary[]>("/admin/deck-tags");
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

/**
 * Start replacing — or, on an audio-only deck, adding — the deck's video.
 * `videoSourcePath` must be staged under the caller's own
 * `platformDeckDrafts/{uid}/` prefix; the API confines admins to it. Returns
 * 202 with the new attempt, which then has to be polled via
 * getPlatformDeckVideoStatus — transcoding takes minutes. A second request
 * while one is running is refused with `VIDEO_REPLACEMENT_IN_PROGRESS`.
 */
export async function replacePlatformDeckVideo(
  deckId: string,
  videoSourcePath: string
): Promise<PlatformDeckVideoReplacement> {
  return apiPost<PlatformDeckVideoReplacement>(`/admin/decks/${deckId}/video`, {
    videoSourcePath,
  });
}

export async function getPlatformDeckVideoStatus(
  deckId: string
): Promise<PlatformDeckVideoStatus> {
  return apiGet<PlatformDeckVideoStatus>(`/admin/decks/${deckId}/video`);
}

/**
 * Abandon an in-flight replacement. Only releases the lock — the deck and its
 * current video are untouched, and the staged upload is left in place for a
 * retry. 404 `NO_VIDEO_REPLACEMENT_IN_PROGRESS` if nothing is running.
 */
export async function cancelPlatformDeckVideoReplacement(
  deckId: string
): Promise<void> {
  await apiDelete<void>(`/admin/decks/${deckId}/video/replacement`);
}
