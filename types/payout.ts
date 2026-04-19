export type SellerAccount = {
  userId: string;
  stripeAccountId: string;
  storeName: string | null;
  country: string | null;
  currency: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  currentlyDue: string[];
  eventuallyDue: string[];
  pastDue: string[];
  pendingVerification: string[];
  disabledReason: string | null;
  currentDeadline: string | null;
  requirementsErrors: unknown[];
  createdAt: string;
  updatedAt: string;
};

export type CreateSellerAccountPayload = {
  email?: string; // Optional custom Stripe email
  storeName?: string; // Store name
};
