import { apiGet, apiGetPublic, apiPost, apiPatch } from "./client";
import type { SellerAccount, CreateSellerAccountPayload } from "@/types/payout";

/**
 * Get the current user's seller account
 */
export async function getMonetizationAccount(): Promise<SellerAccount | null> {
  const result = await apiGet<
    { exists: false } | { exists: true; account: SellerAccount }
  >("/seller-account");
  return result.exists ? result.account : null;
}

/**
 * Create a new seller account
 */
export async function createMonetizationAccount(
  payload: CreateSellerAccountPayload
): Promise<SellerAccount> {
  return apiPost<SellerAccount>("/seller-account", payload);
}

/**
 * Update the seller account (e.g., store name)
 */
export async function updateMonetizationAccount(update: {
  storeName: string;
}): Promise<{ success: boolean }> {
  return apiPatch<{ success: boolean }>("/seller-account", update);
}

/**
 * Get a Stripe onboarding URL to complete account setup
 */
export async function getStripeOnboardingUrl(): Promise<{
  url: string;
  expiresAt: string;
}> {
  return apiPost<{ url: string; expiresAt: string }>(
    "/seller-account/onboarding-sessions"
  );
}

/**
 * Get a Stripe portal session URL (dashboard access)
 */
export async function getStripePortalUrl(): Promise<{ url: string }> {
  return apiPost<{ url: string }>("/seller-account/portal-sessions");
}

/**
 * Get the current effective creator agreement version
 */
export async function getCurrentAgreementVersion(): Promise<{
  version: string;
  termsUrl: string;
} | null> {
  return apiGet<{ version: string; termsUrl: string } | null>(
    "/seller-account/agreements/current"
  );
}

/**
 * Get the full content of a creator agreement by version
 */
export async function getAgreementContent(
  version: string
): Promise<{ version: string; title: string; content: string }> {
  return apiGetPublic<{ version: string; title: string; content: string }>(
    `/seller-account/agreements/${version}`
  );
}

/**
 * Accept Creator Agreement
 */
export async function acceptCreatorAgreement(version: string): Promise<void> {
  await apiPost("/seller-account/agreements", { version });
}
