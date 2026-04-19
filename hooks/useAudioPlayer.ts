import { useCallback, useEffect, useRef } from "react";
import {
  useAudioPlayer as useExpoPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
} from "expo-audio";

type UseAudioPlayerReturn = {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  play: (uri: string) => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  onComplete: React.RefObject<(() => void) | null>;
};

export function useAudioPlayer(): UseAudioPlayerReturn {
  const player = useExpoPlayer(null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const wasPlayingRef = useRef(false);
  const finishedRef = useRef(false);
  const onComplete = useRef<(() => void) | null>(null);

  const isPlaying = status.playing;
  const currentTimeMs = Math.round(status.currentTime * 1000);
  const durationMs = Math.round((status.duration || 0) * 1000);

  // Detect playback finish (was playing -> not playing, near end)
  useEffect(() => {
    if (
      wasPlayingRef.current &&
      !isPlaying &&
      durationMs > 0 &&
      currentTimeMs >= durationMs - 200
    ) {
      finishedRef.current = true;
      onComplete.current?.();
    }
    wasPlayingRef.current = isPlaying;
  }, [isPlaying, currentTimeMs, durationMs]);

  const positionMs = finishedRef.current ? 0 : currentTimeMs;

  const play = useCallback(
    async (uri: string) => {
      finishedRef.current = false;
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      player.replace({ uri });
      player.play();
    },
    [player]
  );

  const pause = useCallback(async () => {
    player.pause();
  }, [player]);

  const stop = useCallback(async () => {
    finishedRef.current = false;
    player.pause();
    player.replace(null);
  }, [player]);

  return { isPlaying, positionMs, durationMs, play, pause, stop, onComplete };
}
