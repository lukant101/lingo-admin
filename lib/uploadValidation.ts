import { Platform } from "react-native";

type FileCategory = "video" | "image" | "audio" | "deckAudio";

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
  // Deck-level long audio (an alternative to the platform deck video). Same
  // formats as card audio, but a much larger size budget so a 5-minute clip —
  // including uncompressed WAV — fits.
  deckAudio: {
    maxBytes: 60 * 1024 * 1024,
    allowedMimeTypes: [
      "audio/mp4",
      "audio/x-m4a",
      "audio/mpeg",
      "audio/wav",
      "audio/wave",
      "audio/x-wav",
      "audio/vnd.wave",
      "video/mp4",
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
export const MAX_VIDEO_DURATION_MS = 300_000;
export const MIN_DECK_AUDIO_DURATION_MS = 5_000;
export const MAX_DECK_AUDIO_DURATION_MS = 300_000;

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

type ValidateVideoMediaParams = {
  fileSize: number | null;
  mimeType: string | null;
  fileName: string | null;
  width: number | null;
  height: number | null;
  durationMs: number | null;
};

/**
 * Everything a platform deck video is checked for before upload: format and
 * size, then duration and dimensions where the picker reported them (the web
 * picker often doesn't, and the transcoder is the authority anyway). Shared by
 * the draft wizard and the published-deck editor so the two never disagree on
 * what a valid video is. Returns an error message, or null if valid.
 */
export function validateVideoMedia({
  fileSize,
  mimeType,
  fileName,
  width,
  height,
  durationMs,
}: ValidateVideoMediaParams): string | null {
  const fileError = validateFile({
    category: "video",
    fileSize,
    mimeType,
    fileName,
  });
  if (fileError) return fileError;

  if (durationMs != null) {
    if (durationMs < MIN_VIDEO_DURATION_MS) {
      return `Video too short (${(durationMs / 1000).toFixed(1)}s). Minimum is ${MIN_VIDEO_DURATION_MS / 1000} seconds.`;
    }
    if (durationMs > MAX_VIDEO_DURATION_MS) {
      return `Video too long (${(durationMs / 1000).toFixed(0)}s). Maximum is ${MAX_VIDEO_DURATION_MS / 1000 / 60} minutes.`;
    }
  }

  if (width != null && height != null) {
    if (width * 16 !== height * 9) {
      return `Video must be 9:16 vertical aspect ratio. Got ${width}x${height}.`;
    }
    if (
      width < MIN_VIDEO_DIMENSIONS.width ||
      height < MIN_VIDEO_DIMENSIONS.height
    ) {
      return `Video resolution too low (${width}x${height}). Minimum is ${MIN_VIDEO_DIMENSIONS.width}x${MIN_VIDEO_DIMENSIONS.height} pixels.`;
    }
    if (
      width > MAX_VIDEO_DIMENSIONS.width ||
      height > MAX_VIDEO_DIMENSIONS.height
    ) {
      return `Video resolution too high (${width}x${height}). Maximum is ${MAX_VIDEO_DIMENSIONS.width}x${MAX_VIDEO_DIMENSIONS.height} pixels.`;
    }
  }

  return null;
}
