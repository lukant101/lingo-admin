import { useState, useRef, useCallback } from "react";
import {
  useAudioRecorder as useExpoRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  type RecordingOptions,
} from "expo-audio";

const RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  web: { mimeType: "audio/mp4", bitsPerSecond: 128000 },
};

type RecordingState = "idle" | "recording" | "stopped";

type UseAudioRecorderReturn = {
  recordingState: RecordingState;
  durationMs: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => Promise<void>;
};

export function useAudioRecorder(): UseAudioRecorderReturn {
  const recorder = useExpoRecorder(RECORDING_OPTIONS);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [durationMs, setDurationMs] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    const { granted } = await AudioModule.requestRecordingPermissionsAsync();
    if (!granted) {
      throw new Error("Microphone permission not granted");
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecordingState("recording");
    setDurationMs(0);

    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      setDurationMs(Date.now() - startTime);
    }, 100);
  }, [recorder]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    clearTimer();
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const uri = recorder.uri;
      setRecordingState("stopped");
      return uri;
    } catch (error) {
      console.error("Failed to stop recording:", error);
      setRecordingState("idle");
      return null;
    }
  }, [clearTimer, recorder]);

  const cancelRecording = useCallback(async () => {
    clearTimer();
    try {
      await recorder.stop();
    } catch {
      // Already stopped
    }
    await setAudioModeAsync({ allowsRecording: false });
    setRecordingState("idle");
    setDurationMs(0);
  }, [clearTimer, recorder]);

  return {
    recordingState,
    durationMs,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
