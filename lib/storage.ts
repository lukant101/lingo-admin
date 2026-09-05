import {
  getDownloadURL,
  getMetadata,
  getStorage,
  listAll,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { Platform } from "react-native";
import { app } from "@/lib/firebase";
import { randomId } from "@/lib/uuid";

const storage = getStorage(app);

/**
 * Dev and production currently share storage buckets, so every non-production
 * object is namespaced under a root path segment. Mirrors how the API derives
 * the same prefix from NODE_ENV.
 *
 * Anything other than "production" gets the prefix — so a production build
 * MUST set EXPO_PUBLIC_APP_ENV=production, or its uploads land under devenv/
 * and the API rejects the save with a *_NOT_FOUND error. Defaulting this way
 * keeps a misconfigured build out of production paths rather than polluting
 * them.
 *
 * Note that paths derived from a draft's server-provided `uploadBasePath`
 * already carry the API's prefix and must not be prefixed again.
 */
const ENV_PATH_PREFIX =
  process.env.EXPO_PUBLIC_APP_ENV === "production" ? "" : "devenv";

/** Join path segments, rooting them at the environment prefix. */
export function storagePath(...segments: string[]): string {
  const path = segments.join("/");
  return ENV_PATH_PREFIX ? `${ENV_PATH_PREFIX}/${path}` : path;
}

type UploadOptions = {
  localUri: string;
  gcsPath: string;
  contentType: string;
  onProgress?: (progress: number) => void;
};

/**
 * Upload a file to Firebase Cloud Storage
 */
export async function uploadFileToStorage({
  localUri,
  gcsPath,
  contentType,
  onProgress,
}: UploadOptions): Promise<{ gcsPath: string }> {
  if (Platform.OS !== "web") {
    const FileSystem = await import("expo-file-system");
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (!fileInfo.exists) {
      throw new Error("File does not exist");
    }
  }

  const response = await fetch(localUri);
  const blob = await response.blob();

  const storageRef = ref(storage, gcsPath);
  const uploadTask = uploadBytesResumable(storageRef, blob, { contentType });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = snapshot.bytesTransferred / snapshot.totalBytes;
        onProgress?.(progress);
      },
      (error) => {
        reject(error);
      },
      () => {
        resolve({ gcsPath });
      }
    );
  });
}

/**
 * Get a download URL for a file in Cloud Storage
 */
export async function getFileDownloadURL(gcsPath: string): Promise<string> {
  return getDownloadURL(ref(storage, gcsPath));
}

type StorageFile = {
  gcsPath: string;
  downloadUrl: string;
};

/**
 * Find the newest file in a Cloud Storage folder, optionally filtered by name prefix.
 * Returns null if no matching files exist.
 */
export async function findNewestFile(
  folderPath: string,
  namePrefix?: string
): Promise<StorageFile | null> {
  const folderRef = ref(storage, folderPath);
  const result = await listAll(folderRef);

  let items = result.items;
  if (namePrefix) {
    items = items.filter((item) => item.name.startsWith(namePrefix));
  }

  if (items.length === 0) return null;

  if (items.length === 1) {
    const downloadUrl = await getDownloadURL(items[0]);
    return { gcsPath: items[0].fullPath, downloadUrl };
  }

  const withMetadata = await Promise.all(
    items.map(async (item) => {
      const metadata = await getMetadata(item);
      return { item, timeCreated: new Date(metadata.timeCreated).getTime() };
    })
  );
  withMetadata.sort((a, b) => b.timeCreated - a.timeCreated);

  const newest = withMetadata[0].item;
  const downloadUrl = await getDownloadURL(newest);
  return { gcsPath: newest.fullPath, downloadUrl };
}

/**
 * Get MIME type from filename extension
 */
export function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    wav: "audio/wav",
    mp4: "video/mp4",
    mov: "video/quicktime",
  };
  return mimeTypes[ext ?? ""] ?? "application/octet-stream";
}

/**
 * Build a GCS path for a studio logo (timestamp-based for cache busting)
 */
export function buildLogoPath(
  firebaseUid: string,
  studioId: string,
  filename: string
): string {
  const ext = filename.split(".").pop() ?? "webp";
  const timestamp = Date.now();
  return storagePath(
    "studios",
    firebaseUid,
    studioId,
    `studio_logo_${timestamp}.${ext}`
  );
}

export function adminVideoPath(
  uploadBasePath: string,
  filename: string
): string {
  const ext = filename.split(".").pop() ?? "mp4";
  return `${uploadBasePath}/video/${randomId()}.${ext}`;
}

export function adminCoverImagePath(
  uploadBasePath: string,
  variant: "horizontal" | "vertical",
  filename: string
): string {
  const ext = filename.split(".").pop() ?? "jpg";
  return `${uploadBasePath}/images/cover_${variant}_${randomId()}.${ext}`;
}

/**
 * Build a staging path for a replacement cover on an already-published deck.
 * Reuses the platformDeckDrafts prefix with the deck id in the draft-id slot —
 * the storage rule matches any value there — and the API copies the file to
 * the CDN on save.
 */
export function platformDeckCoverImagePath(
  uploadBasePath: string,
  variant: "horizontal" | "vertical",
  filename: string
): string {
  const ext = filename.split(".").pop() ?? "jpg";
  return `${uploadBasePath}/images/cover_${variant}_${randomId()}.${ext}`;
}

/**
 * Build a staging path for deck audio added to or replaced on a published
 * deck. Mirrors adminDeckAudioPath so it lands under the draft prefix's
 * `audio/` folder; the API copies it to the CDN on save.
 */
export function platformDeckAudioPath(
  uploadBasePath: string,
  filename: string
): string {
  const ext = filename.split(".").pop() ?? "m4a";
  return `${uploadBasePath}/audio/deck_${randomId()}.${ext}`;
}

/**
 * Build a staging path for a replacement video poster frame on a published
 * deck. Staged alongside the covers; the API copies it to the CDN on save.
 */
export function platformDeckFirstFramePath(
  uploadBasePath: string,
  filename: string
): string {
  const ext = filename.split(".").pop() ?? "jpg";
  return `${uploadBasePath}/images/first_frame_${randomId()}.${ext}`;
}

/**
 * Build a staging path for a video added to or replaced on a published deck.
 * Mirrors adminVideoPath so it lands under the draft prefix's `video/` folder,
 * which is the one slot POST /admin/decks/:id/video accepts; the transcoder
 * reads it from there.
 */
export function platformDeckVideoPath(
  uploadBasePath: string,
  filename: string
): string {
  const ext = filename.split(".").pop() ?? "mp4";
  return `${uploadBasePath}/video/${randomId()}.${ext}`;
}

export function gameCoverImagePath(
  uploadBasePath: string,
  filename: string
): string {
  const ext = filename.split(".").pop() ?? "jpg";
  return `${uploadBasePath}/images/cover_vertical_${randomId()}.${ext}`;
}

export function gameCharacterImagePath(
  uploadBasePath: string,
  slug: string,
  filename: string
): string {
  const ext = filename.split(".").pop() ?? "jpg";
  return `${uploadBasePath}/images/character_${slug}_${randomId()}.${ext}`;
}

export function adminCardAudioPath(
  uploadBasePath: string,
  cardIndex: number,
  filename: string
): string {
  const ext = filename.split(".").pop() ?? "m4a";
  return `${uploadBasePath}/audio/cards/${cardIndex}_${randomId()}.${ext}`;
}

export function adminDeckAudioPath(
  uploadBasePath: string,
  filename: string
): string {
  const ext = filename.split(".").pop() ?? "m4a";
  return `${uploadBasePath}/audio/deck_${randomId()}.${ext}`;
}
