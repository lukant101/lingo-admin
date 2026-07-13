import { apiDelete, apiGet, apiPatch } from "./client";
import type { DeckLevel } from "@/types/langs";
import type {
  GameWithCharacters,
  PaginatedGames,
  UpdateGameInput,
} from "@/types/game";

export type ListGamesQuery = {
  langVariantCode?: string;
  level?: DeckLevel;
  page?: number;
  pageSize?: number;
};

export async function listGames(
  query: ListGamesQuery = {}
): Promise<PaginatedGames> {
  const params: Record<string, string> = {};
  if (query.langVariantCode) params.langVariantCode = query.langVariantCode;
  if (query.level) params.level = query.level;
  if (query.page != null) params.page = String(query.page);
  if (query.pageSize != null) params.pageSize = String(query.pageSize);
  return apiGet<PaginatedGames>(
    "/admin/games",
    Object.keys(params).length > 0 ? params : undefined
  );
}

export async function getGame(gameId: string): Promise<GameWithCharacters> {
  return apiGet<GameWithCharacters>(`/admin/games/${gameId}`);
}

export async function updateGame(
  gameId: string,
  input: UpdateGameInput
): Promise<GameWithCharacters> {
  const payload: Record<string, unknown> = { ...input };
  if (typeof payload.title === "string") {
    payload.title = (payload.title as string).trim();
    if (!payload.title) delete payload.title;
  }
  return apiPatch<GameWithCharacters>(`/admin/games/${gameId}`, payload);
}

export async function deleteGame(gameId: string): Promise<void> {
  await apiDelete<void>(`/admin/games/${gameId}`);
}
