/**
 * Creator Terms of Service document stored in Firestore
 * Path: terms/en/creators/{version}
 */
export type CreatorTermsDocument = {
  version: string; // "2025-01-15" (matches document ID, YYYY-MM-DD format)
  title: string; // "Creator Terms of Service"
  content: string; // Full ToS content (markdown)
  effectiveDate: string; // ISO date when this version takes effect
  termsUrl: string; // "/terms-of-service/2025-01-15" (path without base URL)
  createdAt: string; // ISO timestamp when document was created
  createdBy?: string; // Admin UID who created it (optional)
};

/**
 * Learner Terms of Service document stored in Firestore
 * Path: terms/en/users/{version}
 */
export type LearnerTermsDocument = {
  version: string; // "2025-01-15" (matches document ID, YYYY-MM-DD format)
  title: string; // "Terms of Service"
  content: string; // Full ToS content (markdown)
  effectiveDate: string; // ISO date when this version takes effect
  termsUrl: string; // "/terms" (path without base URL)
  createdAt: string; // ISO timestamp when document was created
  createdBy?: string; // Admin UID who created it (optional)
};

/**
 * Terms acceptance record (shared by creators and learners)
 * Creators: stored in monetizationAccounts/{uid}.terms
 * Learners: stored in userSettings/{uid}.terms
 */
export type TermsAcceptance = {
  version: string; // Version accepted (e.g., "2025-01-15")
  acceptedAt: string; // ISO timestamp when accepted
};
