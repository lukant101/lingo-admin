export type VideoProjectKind = "dialogue" | "song";

export type VideoProjectSongStatus =
  | "none"
  | "generating"
  | "completed"
  | "failed";

export type VideoProjectChatModel = "chatgpt" | "gemini" | "claude";

export type VideoProjectChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type VideoProjectChatThreads = Record<
  VideoProjectChatModel,
  VideoProjectChatMessage[]
>;

export type VideoProjectCard = {
  id: string;
  text: string;
  audioPath: string | null;
};

export type VideoProjectImageStatus = "pending" | "approved" | "redo";

export type VideoProjectImage = {
  id: string;
  prompt: string;
  comments: string | null;
  status: VideoProjectImageStatus;
  path: string;
};

export type VideoProjectPlatform =
  | "tiktok"
  | "instagramReels"
  | "youtubeShorts";

export type VideoProjectDescriptions = Partial<
  Record<VideoProjectPlatform, string>
>;

export type VideoProjectChatResult = {
  threads: VideoProjectChatThreads;
  errors: Partial<Record<VideoProjectChatModel, string>>;
};

export type VideoProjectResponse = {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  kind: VideoProjectKind;
  title: string;
  script: string | null;
  chatThreads: VideoProjectChatThreads;
  cards: VideoProjectCard[];
  images: VideoProjectImage[];
  cardAudioSourcePath: string | null;
  cardAudioPath: string | null;
  suggestedCutPoints: number[] | null;
  cutPoints: number[] | null;
  deckAudioPath: string | null;
  songStylePrompt: string | null;
  songStatus: VideoProjectSongStatus;
  songPath: string | null;
  songErrorCode: string | null;
  descriptions: VideoProjectDescriptions;
  assetBasePath: string;
};

export type PaginatedVideoProjects = {
  data: VideoProjectResponse[];
  total: number;
  page: number;
  pageSize: number;
};
