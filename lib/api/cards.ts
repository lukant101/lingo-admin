import { apiGet, apiPatch, apiPost } from "./client";
import type {
  CardTranslationJob,
  PlatformDeckCardUpdateResult,
  UpdatePlatformDeckCardInput,
} from "@/types/deck";

/**
 * Editing a card on a published platform deck. Cards live under their deck
 * rather than at the top level — the creator-facing `PATCH /cards/:id` knows
 * nothing about staged uploads or translation decks.
 */
export async function updatePlatformDeckCard(
  deckId: string,
  cardId: string,
  input: UpdatePlatformDeckCardInput
): Promise<PlatformDeckCardUpdateResult> {
  const payload: Record<string, unknown> = { ...input };
  if (typeof payload.text === "string") {
    payload.text = (payload.text as string).trim();
  }
  return apiPatch<PlatformDeckCardUpdateResult>(
    `/admin/decks/${deckId}/cards/${cardId}`,
    payload
  );
}

export async function getCardTranslationJob(
  deckId: string,
  cardId: string
): Promise<CardTranslationJob | null> {
  const { job } = await apiGet<{ job: CardTranslationJob | null }>(
    `/admin/decks/${deckId}/cards/${cardId}/translation-job`
  );
  return job;
}

/**
 * Re-runs translations without editing the card. Pass the previous job's
 * `failedVariantCodes` to retry only those; omit to refresh every variant.
 */
export async function retranslateCard(
  deckId: string,
  cardId: string,
  variantCodes?: string[]
): Promise<CardTranslationJob> {
  return apiPost<CardTranslationJob>(
    `/admin/decks/${deckId}/cards/${cardId}/retranslate`,
    variantCodes?.length ? { variantCodes } : {}
  );
}
