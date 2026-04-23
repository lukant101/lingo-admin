import { Platform } from "react-native";

type FileCategory = "video" | "image" | "audio";

type FileLimit = {
  maxBytes: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  label: string;
};

export const FILE_LIMITS: Record<FileCategory, FileLimit> = {
  video: {
    maxBytes: 500 * 1024 * 1024,
    allowedMimeTypes: ["video/mp4", "video/quicktime"],
    allowedExtensions: ["mp4", "mov"],
    label: "Video",
  },
  image: {
    maxBytes: 3 * 1024 * 1024,
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    ],
    allowedExtensions: ["jpeg", "jpg", "png", "webp", "heic", "heif"],
    label: "Image",
  },
  // .aac files are NOT accepted. An .aac file may contain raw ADTS frames
  // (headerless AAC) which OpenAI's speech-to-text API cannot decode.
  // Renaming .aac → .mp4 works when the file is actually an MP4/M4A container,
  // but that is not reliably the case, so we reject .aac entirely.
  audio: {
    maxBytes: 3 * 1024 * 1024,
    allowedMimeTypes: [
      "audio/mp4",
      "audio/x-m4a",
      "audio/mpeg",
      "audio/wav",
      "audio/wave",
      "audio/x-wav",
      "audio/vnd.wave",
      "video/mp4", // Some browsers (notably Safari) use video/mp4 for M4A audio-only files
    ],
    allowedExtensions: ["m4a", "mp3", "mp4", "wav"],
    label: "Audio",
  },
};

type ValidateFileParams = {
  category: FileCategory;
  fileSize: number | null;
  mimeType: string | null;
  fileName: string | null;
};

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export const MIN_AUDIO_DURATION_MS = 500;
export const MAX_AUDIO_DURATION_MS = 10_000;
export const MIN_VIDEO_DURATION_MS = 10_000;
export const MAX_VIDEO_DURATION_MS = 180_000;

export const MIN_VIDEO_DIMENSIONS = { width: 720, height: 1280 };
export const MAX_VIDEO_DIMENSIONS = { width: 1080, height: 1920 };

function browserSupportsHeic(): boolean {
  if (Platform.OS !== "web") return true;
  if (typeof navigator === "undefined") return false;
  // Safari supports HEIC natively; Chrome, Firefox, and Edge do not
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/**
 * Validate a file against category limits.
 * Returns an error message string, or null if valid.
 */
export function validateFile({
  category,
  fileSize,
  mimeType,
  fileName,
}: ValidateFileParams): string | null {
  const limits = FILE_LIMITS[category];

  // On web, reject HEIC/HEIF in browsers that can't decode them
  if (category === "image" && Platform.OS === "web") {
    const isHeicMime =
      !!mimeType &&
      ["image/heic", "image/heif"].includes(mimeType.toLowerCase());
    const ext = fileName?.split(".").pop()?.toLowerCase();
    const isHeicExt = !!ext && ["heic", "heif"].includes(ext);
    if ((isHeicMime || isHeicExt) && !browserSupportsHeic()) {
      return "HEIC/HEIF images are not supported in this browser. Please use Safari, or convert to WebP (recommended), JPEG, or PNG.";
    }
  }

  // Check format — prefer MIME type, fall back to extension
  const heicExts = ["heic", "heif"];
  const displayExtensions =
    category === "image" && Platform.OS === "web" && !browserSupportsHeic()
      ? limits.allowedExtensions.filter((e) => !heicExts.includes(e))
      : limits.allowedExtensions;

  if (mimeType) {
    if (!limits.allowedMimeTypes.includes(mimeType.toLowerCase())) {
      return `${limits.label} format not supported. Accepted: ${displayExtensions.join(", ")}`;
    }
  } else if (fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (!ext || !limits.allowedExtensions.includes(ext)) {
      return `${limits.label} format not supported. Accepted: ${displayExtensions.join(", ")}`;
    }
  }

  // Check size
  if (fileSize != null && fileSize > limits.maxBytes) {
    return `${limits.label} is too large (${formatSize(fileSize)}). Maximum size is ${formatSize(limits.maxBytes)}.`;
  }

  return null;
}
