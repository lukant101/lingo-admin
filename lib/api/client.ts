import { auth, getAppCheckToken } from "@/lib/firebase";
import { API_BASE_URL } from "@/lib/constants";

export type ApiError = {
  message: string;
  status: number;
};

export class ApiClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

/**
 * Get the current user's ID token for API authentication
 */
async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    return await user.getIdToken();
  } catch (error) {
    console.error("Failed to get ID token:", error);
    return null;
  }
}

/**
 * Base fetch function with Bearer token authentication
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const [token, appCheckToken] = await Promise.all([
    getAuthToken(),
    getAppCheckToken(),
  ]);

  if (!token) {
    throw new ApiClientError("Not authenticated", 401);
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...(appCheckToken ? { "x-appcheck": appCheckToken } : undefined),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = "Request failed";
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // Response might not be JSON
    }
    throw new ApiClientError(errorMessage, response.status);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return null as T;
  }

  return JSON.parse(text) as T;
}

/**
 * Public GET request helper (no auth token required)
 */
export async function apiGetPublic<T>(
  endpoint: string,
  params?: Record<string, string>
): Promise<T> {
  const url = params
    ? `${endpoint}?${new URLSearchParams(params).toString()}`
    : endpoint;

  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    let errorMessage = "Request failed";
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // Response might not be JSON
    }
    throw new ApiClientError(errorMessage, response.status);
  }

  const text = await response.text();
  if (!text) {
    return null as T;
  }

  return JSON.parse(text) as T;
}

/**
 * GET request helper
 */
export async function apiGet<T>(
  endpoint: string,
  params?: Record<string, string>
): Promise<T> {
  const url = params
    ? `${endpoint}?${new URLSearchParams(params).toString()}`
    : endpoint;

  return apiFetch<T>(url, { method: "GET" });
}

/**
 * POST request helper
 */
export async function apiPost<T>(
  endpoint: string,
  body?: Record<string, unknown>
): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PATCH request helper
 */
export async function apiPatch<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
