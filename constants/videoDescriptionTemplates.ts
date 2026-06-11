import type { VideoProjectPlatform } from "@/types/videoProject";

export type DescriptionTemplate = {
  id: string;
  name: string;
  /** Supports the {title} placeholder. */
  body: string;
};

export const PLATFORM_LABELS: Record<VideoProjectPlatform, string> = {
  tiktok: "TikTok",
  instagramReels: "Instagram Reels",
  youtubeShorts: "YouTube Shorts",
};

export const PLATFORM_ORDER: VideoProjectPlatform[] = [
  "tiktok",
  "instagramReels",
  "youtubeShorts",
];

const PLATFORM_HASHTAGS: Record<VideoProjectPlatform, string> = {
  tiktok: "#languagelearning #learnontiktok #fyp",
  instagramReels: "#languagelearning #reels #learnlanguages",
  youtubeShorts: "#languagelearning #shorts",
};

const BASE_TEMPLATES: DescriptionTemplate[] = [
  {
    id: "learn-with-us",
    name: "Learn with us",
    body:
      "{title} 🎧\n" +
      "Watch, repeat, and learn — new language videos every week!\n" +
      "📲 Practice this lesson card by card in the LingoHouse app — link in bio.\n",
  },
  {
    id: "challenge",
    name: "Challenge",
    body:
      "{title} — can you say every line? 🗣️\n" +
      "Turn on the sound and repeat after us.\n" +
      "📲 Full lesson in the LingoHouse app — link in bio.\n",
  },
  {
    id: "song",
    name: "Song",
    body:
      "{title} 🎵\n" +
      "Sing along and learn — music makes the words stick!\n" +
      "📲 Practice the lyrics card by card in the LingoHouse app — link in bio.\n",
  },
];

export const DESCRIPTION_TEMPLATES = BASE_TEMPLATES;

export function renderTemplate(
  template: DescriptionTemplate,
  platform: VideoProjectPlatform,
  title: string
): string {
  return (
    template.body.replaceAll("{title}", title.trim() || "New video") +
    "\n" +
    PLATFORM_HASHTAGS[platform]
  );
}
