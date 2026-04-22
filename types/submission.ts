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
