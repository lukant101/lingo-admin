import { apiGet, apiPost, apiPatch } from "./client";
import type {
  Submission,
  PaginatedSubmissions,
  CardInput,
} from "@/types/submission";
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
 * Create a new submission draft
 */
export async function createSubmission(
  studioId: string,
  data: { title: string }
): Promise<Submission> {
  const title = data.title.trim();
  if (!title) throw new Error("Submission title is required");
  return apiPost<Submission>(`/studios/${studioId}/submissions`, { title });
}

/**
 * List submissions for a studio
 */
export async function listSubmissions(
  studioId: string,
  opts?: { status?: string; page?: number; pageSize?: number }
): Promise<PaginatedSubmissions> {
  const params: Record<string, string> = {};
  if (opts?.status) params.status = opts.status;
  if (opts?.page) params.page = String(opts.page);
  if (opts?.pageSize) params.pageSize = String(opts.pageSize);
  return apiGet<PaginatedSubmissions>(
    `/studios/${studioId}/submissions`,
    Object.keys(params).length > 0 ? params : undefined
  );
}

/**
 * Get a single submission
 */
export async function getSubmission(
  studioId: string,
  submissionId: string
): Promise<Submission> {
  return apiGet<Submission>(`/studios/${studioId}/submissions/${submissionId}`);
}

export type CompletedStep = "video" | "images" | "card_audio" | "card_text";

/**
 * Update a submission (PATCH)
 */
export async function updateSubmission(
  studioId: string,
  submissionId: string,
  data: {
    title?: string;
    cardsInput?: CardInput[];
    clientCompletedSteps: CompletedStep[];
    clientReviewCardIndex?: number;
  }
): Promise<Submission> {
  const payload = { ...data };
  if (payload.title !== undefined) {
    payload.title = payload.title.trim();
    if (!payload.title) delete payload.title;
  }
  return apiPatch<Submission>(
    `/studios/${studioId}/submissions/${submissionId}`,
    payload
  );
}

/**
 * Submit a submission for review
 */
export async function submitForReview(
  studioId: string,
  submissionId: string
): Promise<Submission> {
  return apiPost<Submission>(
    `/studios/${studioId}/submissions/${submissionId}/submit`
  );
}

/**
 * Cancel a submission
 */
export async function cancelSubmission(
  studioId: string,
  submissionId: string
): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>(
    `/studios/${studioId}/submissions/${submissionId}/cancel`
  );
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
