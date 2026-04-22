import { randomId } from "@/lib/uuid";

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
