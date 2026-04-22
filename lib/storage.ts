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
  return `studios/${firebaseUid}/${studioId}/studio_logo_${timestamp}.${ext}`;
}

export function adminVideoPath(uploadBasePath: string, filename: string): string {
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

export function adminCardAudioPath(
  uploadBasePath: string,
  cardIndex: number,
  filename: string
): string {
  const ext = filename.split(".").pop() ?? "m4a";
  return `${uploadBasePath}/audio/cards/${cardIndex}_${randomId()}.${ext}`;
}
