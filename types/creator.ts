/**
 * Data submitted by the user in the creator application form
 */
export type CreatorApplicationFormData = {
  legalName: string;
  publishesOnline: boolean;
  contentLinks: string[];
  videoDescription: string;
  languageCode: string;
  language: string;
  canRegisterStripe: boolean;
  isAdult: boolean;
};

export type ApplicationStatus =
  | "applied"
  | "in_review"
  | "withdrawn"
  | "rejected"
  | "rejected_terminal"
  | "approved";

export type CreatorStatus =
  | "active"
  | "suspended"
  | "banned"
  | "maintenance"
  | "country_ineligible";

export type CreatorTier = "standard" | "premium";

export type AllowedLanguage = {
  id: string;
  code: string;
  name: string;
  nativeName: string;
};
