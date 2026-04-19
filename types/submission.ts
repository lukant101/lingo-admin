export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "requires_admin_review"
  | "approved"
  | "processing_started"
  | "processing_completed"
  | "rejected"
  | "cancelled"
  | "failed";

export type CardInput = {
  text: string;
  audio: string;
};

export type Submission = {
  id: string;
  studioId: string;
  creatorUid: string;
  title: string;
  status: SubmissionStatus;
  cardsInput: CardInput[];
  coverImageHorizontal?: string;
  coverImageVertical?: string;
  video?: string;
  deckId?: string;
  rejectionReason?: string;
  errorCode?: string;
  transcriptions?: string[];
  transcriptionsProvidedOrDeniedAt?: string;
  clientCompletedSteps?: string[];
  clientReviewCardIndex?: number;
  createdAt: string;
  updatedAt: string;
};

export type SubmissionSummary = {
  id: string;
  studioId: string;
  title: string;
  status: SubmissionStatus;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedSubmissions = {
  data: SubmissionSummary[];
  total: number;
  page: number;
  pageSize: number;
};

export type CardDraft = {
  id: string;
  text: string;
  audioUri: string | null;
  audioGcsPath: string | null;
  uploadProgress: number;
  isUploading: boolean;
  error: string | null;
};

export type MediaUpload = {
  uri: string;
  gcsPath: string | null;
  fileName?: string;
  progress: number;
  isUploading: boolean;
  error: string | null;
};
