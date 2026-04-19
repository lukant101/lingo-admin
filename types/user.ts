import { ApplicationStatus, CreatorStatus, CreatorTier } from "./creator";

export type CreatorAccount = {
  applicationStatus: ApplicationStatus | null;
  creatorStatus: CreatorStatus | null;
  creatorTier: CreatorTier | null;
  updatedAt: string;
  canReapplyAt?: string;
  langVariantCodes?: string[];
  maxStudios?: number;
};
