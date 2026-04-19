import { DeckLevel } from "./langs";

/**
 * Price level available for studios
 */
export type PriceLevel = {
  id: string;
  description: string;
  oneTimeDisplayPrice: string;
  subscriptionDisplayPrice: string;
  eligibleCreatorTiers: string[];
  sortOrder: number;
};

/**
 * Purchase type - one-time payment or recurring subscription
 */
export type PurchaseType = "payment" | "subscription";

export type StudioPass = {
  uid: string;
  studioId: string;
  creatorUid: string;
  creatorName?: string;
  langVariantCode: string;
  level: DeckLevel;
  paymentIntentId: string;
  amount: string;
  purchasedAt: string; // ISO string
  accessTill: string; // ISO string
  type: PurchaseType;
  subscriptionId?: string; // For subscription purchases
  productName?: string; // Formatted product name for display
  /**
   * Cancellation fields - only set for voluntary cancellations where user
   * still has paid time remaining. When subscription is deleted due to
   * failed payments, the access document is deleted entirely (not updated).
   */
  cancelAtPeriodEnd?: boolean;
  cancelAt?: string;
};

/**
 * Extends StudioPass with computed display fields.
 * Used in: useUserContent hook and studio-passes page
 */
export type StudioPassExtended = StudioPass & {
  creatorName: string; // Required (with fallback)
  languageName: string;
  isActive: boolean;
  daysRemaining: number;
};

export type StudioSettings = {
  id: string;
  creatorId: string;
  langVariantCode: string;
  level: DeckLevel;
  name: string;
  description?: string;
  logoUrl: string | null;
  isForSale: boolean;
  priceLevelId: string;
  stripeProductId: string | null;
  stripePriceId: string | null;
  stripeSubscriptionPriceId: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Stripe Checkout Session creation payload
 */
export type StripeCreateCheckoutPayload = {
  mode: PurchaseType;
  cancelUrl: string;
  priceId: string;
  studioId: string;
};

/**
 * Metadata stored on Stripe Payment Intents and Subscriptions.
 * Used to identify the purchase context in webhook handlers.
 */
export type StripePaymentMetadata = {
  customerUid: string;
  studioId: string;
  creatorUid: string;
  langVariantCode: string;
  level: string;
  productName: string;
};

/**
 * Type guard to validate Stripe payment metadata at runtime.
 * Returns true if all required fields are present and are strings.
 */
export function isStripePaymentMetadata(
  metadata: unknown
): metadata is StripePaymentMetadata {
  if (typeof metadata !== "object" || metadata === null) {
    return false;
  }
  const m = metadata as Record<string, unknown>;
  return (
    typeof m.customerUid === "string" &&
    typeof m.studioId === "string" &&
    typeof m.creatorUid === "string" &&
    typeof m.langVariantCode === "string" &&
    typeof m.level === "string" &&
    typeof m.productName === "string"
  );
}
