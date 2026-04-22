import { apiDelete, apiGet, apiPatch, apiPost } from "./client";
import type { DeckLevel } from "@/types/langs";
import type {
  CollectionDeckResponse,
  CollectionResponse,
  PaginatedCollections,
} from "@/types/collection";
import type {
  PaginatedPlatformDeckDrafts,
  PlatformDeckDraftCard,
  PlatformDeckDraftResponse,
  PlatformDeckDraftStatus,
} from "@/types/platformDeck";

// --- Collections ---

export type ListCollectionsQuery = {
  langVariantId?: string;
  level?: DeckLevel;
  forKids?: boolean;
  page?: number;
  pageSize?: number;
};

export async function listCollections(
  query: ListCollectionsQuery = {}
): Promise<PaginatedCollections> {
  const params: Record<string, string> = {};
  if (query.langVariantId) params.langVariantId = query.langVariantId;
  if (query.level) params.level = query.level;
  if (query.forKids != null) params.forKids = String(query.forKids);
  if (query.page != null) params.page = String(query.page);
  if (query.pageSize != null) params.pageSize = String(query.pageSize);
  return apiGet<PaginatedCollections>(
    "/admin/collections",
    Object.keys(params).length > 0 ? params : undefined
  );
}

export type CreateCollectionInput = {
  title: string;
  langVariantId: string;
  level: DeckLevel;
  forKids: boolean;
  mature: boolean;
};

export async function createCollection(
  input: CreateCollectionInput
): Promise<CollectionResponse> {
  return apiPost<CollectionResponse>("/admin/collections", {
    ...input,
    title: input.title.trim(),
  });
}

// --- Platform-deck drafts ---

export async function createPlatformDeckDraft(input: {
  title: string;
  collectionId: string;
}): Promise<PlatformDeckDraftResponse> {
  return apiPost<PlatformDeckDraftResponse>("/admin/platform-deck-drafts", {
    title: input.title.trim(),
    collectionId: input.collectionId,
  });
}

export async function getPlatformDeckDraft(
  draftId: string
): Promise<PlatformDeckDraftResponse> {
  return apiGet<PlatformDeckDraftResponse>(
    `/admin/platform-deck-drafts/${draftId}`
  );
}

export type ListDraftsQuery = {
  collectionId?: string;
  status?: PlatformDeckDraftStatus;
  page?: number;
  pageSize?: number;
};

export async function listPlatformDeckDrafts(
  query: ListDraftsQuery = {}
): Promise<PaginatedPlatformDeckDrafts> {
  const params: Record<string, string> = {};
  if (query.collectionId) params.collectionId = query.collectionId;
  if (query.status) params.status = query.status;
  if (query.page != null) params.page = String(query.page);
  if (query.pageSize != null) params.pageSize = String(query.pageSize);
  return apiGet<PaginatedPlatformDeckDrafts>(
    "/admin/platform-deck-drafts",
    Object.keys(params).length > 0 ? params : undefined
  );
}

export type UpdatePlatformDeckDraftInput = {
  title?: string;
  horizontalImageSourcePath?: string;
  verticalImageSourcePath?: string;
  videoSourcePath?: string;
  cards?: PlatformDeckDraftCard[];
};

export async function updatePlatformDeckDraft(
  draftId: string,
  input: UpdatePlatformDeckDraftInput
): Promise<PlatformDeckDraftResponse> {
  const payload: Record<string, unknown> = { ...input };
  if (typeof payload.title === "string") {
    payload.title = (payload.title as string).trim();
    if (!payload.title) delete payload.title;
  }
  return apiPatch<PlatformDeckDraftResponse>(
    `/admin/platform-deck-drafts/${draftId}`,
    payload
  );
}

export async function publishPlatformDeckDraft(
  draftId: string
): Promise<PlatformDeckDraftResponse> {
  return apiPost<PlatformDeckDraftResponse>(
    `/admin/platform-deck-drafts/${draftId}/publish`
  );
}

export async function deletePlatformDeckDraft(draftId: string): Promise<void> {
  await apiDelete<void>(`/admin/platform-deck-drafts/${draftId}`);
}

// --- Collection ↔ Deck links ---

export async function updateCollectionDeck(
  collectionId: string,
  deckId: string,
  input: { published?: boolean; sortOrder?: number }
): Promise<CollectionDeckResponse> {
  return apiPatch<CollectionDeckResponse>(
    `/admin/collections/${collectionId}/decks/${deckId}`,
    input as Record<string, unknown>
  );
}

export async function addDeckToCollection(
  collectionId: string,
  input: { deckId: string; sortOrder: number; published: boolean }
): Promise<{ added: true }> {
  return apiPost<{ added: true }>(
    `/admin/collections/${collectionId}/decks`,
    input
  );
}

export async function removeDeckFromCollection(
  collectionId: string,
  deckId: string
): Promise<void> {
  await apiDelete<void>(
    `/admin/collections/${collectionId}/decks/${deckId}`
  );
}
