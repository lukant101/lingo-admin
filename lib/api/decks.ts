import { apiGet, apiPatch } from "./client";
import type {
  PlatformDeckWithCards,
  UpdatePlatformDeckInput,
} from "@/types/deck";

export async function getPlatformDeck(
  deckId: string
): Promise<PlatformDeckWithCards> {
  return apiGet<PlatformDeckWithCards>(`/admin/decks/${deckId}`);
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
