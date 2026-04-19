import { apiGet, apiPost, apiPatch } from "./client";
import type { StudioSettings, PriceLevel } from "@/types/studio";

/**
 * Create a new studio
 */
export async function createStudio(data: {
  name: string;
  description?: string;
  langVariantCode: string;
  level: string;
}): Promise<{ studioId: string }> {
  return apiPost<{ studioId: string }>("/studios", data);
}

/**
 * Get studio settings
 */
export async function getStudioSettings(
  studioId: string
): Promise<StudioSettings> {
  return apiGet<StudioSettings>(`/studios/${studioId}`);
}

/**
 * Update studio settings
 */
export async function updateStudioSettings(
  studioId: string,
  update: {
    name?: string;
    description?: string;
    priceLevelId?: string;
    isForSale?: boolean;
    logoStoragePath?: string;
  }
): Promise<{ success: boolean }> {
  return apiPatch<{ success: boolean }>(`/studios/${studioId}`, update);
}

/**
 * Get available price levels
 */
export async function getPriceLevels(): Promise<PriceLevel[]> {
  return apiGet<PriceLevel[]>("/price-levels");
}
