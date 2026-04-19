import { apiGet, apiPatch, apiPost } from "./client";

export type Store = {
  publicId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export async function getStore(): Promise<Store | null> {
  try {
    return await apiGet<Store>("/stores");
  } catch (err) {
    if (
      err instanceof Error &&
      "status" in err &&
      (err as any).status === 404
    ) {
      return null;
    }
    throw err;
  }
}

export async function createStore(data: { name: string }): Promise<Store> {
  return apiPost<Store>("/stores", data);
}

export async function updateStore(update: { name: string }): Promise<Store> {
  return apiPatch<Store>("/stores", update);
}
