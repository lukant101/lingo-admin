import { apiDelete, apiGet, apiPatch, apiPost } from "./client";
import type {
  CreateGameDraftInput,
  GameDraftResponse,
  GameDraftStatus,
  PaginatedGameDrafts,
  UpdateGameDraftInput,
} from "@/types/game";

export async function createGameDraft(
  input: CreateGameDraftInput
): Promise<GameDraftResponse> {
  return apiPost<GameDraftResponse>("/admin/game-drafts", {
    ...input,
    title: input.title.trim(),
  });
}

export async function getGameDraft(
  draftId: string
): Promise<GameDraftResponse> {
  return apiGet<GameDraftResponse>(`/admin/game-drafts/${draftId}`);
}

export type ListGameDraftsQuery = {
  status?: GameDraftStatus;
  langVariantCode?: string;
  page?: number;
  pageSize?: number;
};

export async function listGameDrafts(
  query: ListGameDraftsQuery = {}
): Promise<PaginatedGameDrafts> {
  const params: Record<string, string> = {};
  if (query.status) params.status = query.status;
  if (query.langVariantCode) params.langVariantCode = query.langVariantCode;
  if (query.page != null) params.page = String(query.page);
  if (query.pageSize != null) params.pageSize = String(query.pageSize);
  return apiGet<PaginatedGameDrafts>(
    "/admin/game-drafts",
    Object.keys(params).length > 0 ? params : undefined
  );
}

export async function updateGameDraft(
  draftId: string,
  input: UpdateGameDraftInput
): Promise<GameDraftResponse> {
  const payload: Record<string, unknown> = { ...input };
  if (typeof payload.title === "string") {
    payload.title = (payload.title as string).trim();
    if (!payload.title) delete payload.title;
  }
  return apiPatch<GameDraftResponse>(`/admin/game-drafts/${draftId}`, payload);
}

export async function publishGameDraft(
  draftId: string
): Promise<GameDraftResponse> {
  return apiPost<GameDraftResponse>(`/admin/game-drafts/${draftId}/publish`);
}

export async function deleteGameDraft(draftId: string): Promise<void> {
  await apiDelete<void>(`/admin/game-drafts/${draftId}`);
}
