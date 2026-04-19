import { apiGet, apiPost, apiPatch } from "./client";
import type {
  CreatorApplicationFormData,
  ApplicationStatus,
  CreatorStatus,
  CreatorTier,
} from "@/types/creator";

type CreatorApplicationData = {
  status: ApplicationStatus;
  canReapplyAt: string | null;
  langVariantId: string;
  createdAt: string;
  updatedAt: string;
};

type CreatorData = {
  userId: string;
  displayName: string;
  tier: CreatorTier;
  status: CreatorStatus;
  langVariantCodes: string[];
  maxStudios: number;
  createdAt: string;
  updatedAt: string;
};

export type CreatorResponse = {
  application: CreatorApplicationData | null;
  creator: CreatorData | null;
};

/**
 * Get the current user's creator application and creator profile
 */
export async function getCreator(): Promise<CreatorResponse> {
  return apiGet<CreatorResponse>("/creators");
}

/**
 * Submit a creator application
 */
export async function submitCreatorApplication(
  application: CreatorApplicationFormData
): Promise<CreatorApplicationData> {
  const {
    legalName,
    publishesOnline,
    contentLinks,
    videoDescription,
    languageCode,
  } = application;
  return apiPost<CreatorApplicationData>("/creator-applications", {
    legalName,
    publishesOnline,
    contentLinks,
    videoDescription,
    languageVariantCode: languageCode,
  });
}

/**
 * Withdraw a pending creator application
 */
export async function withdrawCreatorApplication(): Promise<CreatorApplicationData> {
  return apiPatch<CreatorApplicationData>("/creator-applications", {
    status: "withdrawn",
  });
}
