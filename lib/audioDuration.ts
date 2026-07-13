import { createAudioPlayer } from "expo-audio";

/**
 * Probe an audio file's duration. Resolves 0 if the probe fails or stalls, so
 * callers should treat 0 as "unknown" rather than "too short".
 */
export function getAudioDurationMs(uri: string): Promise<number> {
  return new Promise((resolve) => {
    const player = createAudioPlayer(uri);
    const sub = player.addListener("playbackStatusUpdate", (status) => {
      if (status.isLoaded) {
        sub.remove();
        const ms = Math.round(player.duration * 1000);
        player.remove();
        resolve(ms);
      }
    });
    setTimeout(() => {
      sub.remove();
      player.remove();
      resolve(0);
    }, 5000);
  });
}
