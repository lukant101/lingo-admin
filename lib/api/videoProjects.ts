import { apiDelete, apiGet, apiPatch, apiPost } from "./client";
import type {
  PaginatedVideoProjects,
  VideoProjectCard,
  VideoProjectChatModel,
  VideoProjectChatResult,
  VideoProjectDescriptions,
  VideoProjectKind,
  VideoProjectResponse,
} from "@/types/videoProject";

export async function createVideoProject(input: {
  title: string;
  kind: VideoProjectKind;
}): Promise<VideoProjectResponse> {
  return apiPost<VideoProjectResponse>("/admin/video-projects", {
    title: input.title.trim(),
    kind: input.kind,
  });
}

export async function getVideoProject(
  projectId: string
): Promise<VideoProjectResponse> {
  return apiGet<VideoProjectResponse>(`/admin/video-projects/${projectId}`);
}

export type ListVideoProjectsQuery = {
  kind?: VideoProjectKind;
  page?: number;
  pageSize?: number;
};

export async function listVideoProjects(
  query: ListVideoProjectsQuery = {}
): Promise<PaginatedVideoProjects> {
  const params: Record<string, string> = {};
  if (query.kind) params.kind = query.kind;
  if (query.page != null) params.page = String(query.page);
  if (query.pageSize != null) params.pageSize = String(query.pageSize);
  return apiGet<PaginatedVideoProjects>(
    "/admin/video-projects",
    Object.keys(params).length > 0 ? params : undefined
  );
}

export type UpdateVideoProjectInput = {
  title?: string;
  script?: string;
  cards?: VideoProjectCard[];
  descriptions?: VideoProjectDescriptions;
  songStylePrompt?: string;
};

export async function updateVideoProject(
  projectId: string,
  input: UpdateVideoProjectInput
): Promise<VideoProjectResponse> {
  const payload: Record<string, unknown> = { ...input };
  if (typeof payload.title === "string") {
    payload.title = (payload.title as string).trim();
    if (!payload.title) delete payload.title;
  }
  return apiPatch<VideoProjectResponse>(
    `/admin/video-projects/${projectId}`,
    payload
  );
}

export async function deleteVideoProject(projectId: string): Promise<void> {
  await apiDelete<void>(`/admin/video-projects/${projectId}`);
}

// --- Images ---

export async function generateVideoProjectImages(
  projectId: string,
  input: { prompt: string; count?: number }
): Promise<VideoProjectResponse> {
  return apiPost<VideoProjectResponse>(
    `/admin/video-projects/${projectId}/images`,
    input
  );
}

export async function updateVideoProjectImage(
  projectId: string,
  imageId: string,
  input: { status?: "pending" | "approved" | "redo"; comments?: string }
): Promise<VideoProjectResponse> {
  return apiPatch<VideoProjectResponse>(
    `/admin/video-projects/${projectId}/images/${imageId}`,
    input
  );
}

export async function redoVideoProjectImage(
  projectId: string,
  imageId: string,
  input: { comments?: string } = {}
): Promise<VideoProjectResponse> {
  return apiPost<VideoProjectResponse>(
    `/admin/video-projects/${projectId}/images/${imageId}/redo`,
    input
  );
}

export async function deleteVideoProjectImage(
  projectId: string,
  imageId: string
): Promise<VideoProjectResponse> {
  return apiDelete<VideoProjectResponse>(
    `/admin/video-projects/${projectId}/images/${imageId}`
  );
}

// --- Audio ---

export async function generateVideoProjectCardAudio(
  projectId: string,
  input: { voiceName?: string } = {}
): Promise<VideoProjectResponse> {
  return apiPost<VideoProjectResponse>(
    `/admin/video-projects/${projectId}/card-audio`,
    input
  );
}

export async function splitVideoProjectCardAudio(
  projectId: string,
  input: { cutPoints: number[] }
): Promise<VideoProjectResponse> {
  return apiPost<VideoProjectResponse>(
    `/admin/video-projects/${projectId}/card-audio/split`,
    input
  );
}

export async function generateVideoProjectDeckAudio(
  projectId: string,
  input: { voiceName?: string; secondVoiceName?: string } = {}
): Promise<VideoProjectResponse> {
  return apiPost<VideoProjectResponse>(
    `/admin/video-projects/${projectId}/deck-audio`,
    input
  );
}

// --- Song ---

export async function generateVideoProjectSongStylePrompt(
  projectId: string,
  input: { instructions?: string } = {}
): Promise<VideoProjectResponse> {
  return apiPost<VideoProjectResponse>(
    `/admin/video-projects/${projectId}/song-style-prompt`,
    input
  );
}

export async function startVideoProjectSong(
  projectId: string
): Promise<VideoProjectResponse> {
  return apiPost<VideoProjectResponse>(
    `/admin/video-projects/${projectId}/song`
  );
}

export async function getVideoProjectSongStatus(
  projectId: string
): Promise<VideoProjectResponse> {
  return apiGet<VideoProjectResponse>(
    `/admin/video-projects/${projectId}/song/status`
  );
}

// --- Export ---

export type VideoProjectExportResult = {
  url: string;
  fileCount: number;
  expiresInMinutes: number;
};

export async function exportVideoProject(
  projectId: string
): Promise<VideoProjectExportResult> {
  return apiPost<VideoProjectExportResult>(
    `/admin/video-projects/${projectId}/export`
  );
}

// --- Script chat ---

export async function sendVideoProjectChatMessage(
  projectId: string,
  input: { message: string; models?: VideoProjectChatModel[] }
): Promise<VideoProjectChatResult> {
  return apiPost<VideoProjectChatResult>(
    `/admin/video-projects/${projectId}/chat`,
    input
  );
}

export async function resetVideoProjectChatThreads(
  projectId: string,
  models?: VideoProjectChatModel[]
): Promise<VideoProjectChatResult> {
  return apiPost<VideoProjectChatResult>(
    `/admin/video-projects/${projectId}/chat/reset`,
    models && models.length > 0 ? { models } : {}
  );
}
