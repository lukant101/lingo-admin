import { Button } from "@/components/ui/Button";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { setRecordingResult } from "@/lib/recordingResult";
import { MAX_AUDIO_DURATION_MS } from "@/lib/uploadValidation";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { IconButton, Text, useTheme } from "react-native-paper";

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function RecordAudioScreen() {
  const theme = useTheme();
  const router = useRouter();
  const recorder = useAudioRecorder();
  const player = useAudioPlayer();
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);

  const handleStartRecording = async () => {
    setRecordedUri(null);
    try {
      await recorder.startRecording();
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const handleStopRecording = async () => {
    const uri = await recorder.stopRecording();
    if (uri) {
      setRecordedUri(uri);
      setRecordedDuration(recorder.durationMs);
    }
  };

  const handlePlayback = async () => {
    if (!recordedUri) return;
    if (player.isPlaying) {
      await player.stop();
    } else {
      await player.play(recordedUri);
    }
  };

  const handleUseRecording = () => {
    if (!recordedUri) return;
    setRecordingResult({
      uri: recordedUri,
      durationMs: recordedDuration,
      filename: "recording.m4a",
    });
    router.back();
  };

  const handleReRecord = async () => {
    await player.stop();
    await recorder.startRecording();
    setRecordedUri(null);
    setRecordedDuration(0);
  };

  const handleCancel = async () => {
    await recorder.cancelRecording();
    await player.stop();
    router.back();
  };

  const stopRef = useRef(handleStopRecording);
  stopRef.current = handleStopRecording;
  useEffect(() => {
    if (
      recorder.recordingState === "recording" &&
      recorder.durationMs >= MAX_AUDIO_DURATION_MS
    ) {
      stopRef.current();
    }
  }, [recorder.recordingState, recorder.durationMs]);

  const isRecording = recorder.recordingState === "recording";

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Text variant="headlineSmall" style={styles.heading}>
        Record Audio
      </Text>

      <Text
        variant="displayMedium"
        style={[styles.timer, { color: theme.colors.primary }]}
      >
        {formatDuration(isRecording ? recorder.durationMs : recordedDuration)}
      </Text>

      {!recordedUri ? (
        <View style={styles.controls}>
          {isRecording ? (
            <IconButton
              icon="stop"
              mode="contained"
              size={48}
              iconColor={theme.colors.onError}
              containerColor={theme.colors.error}
              onPress={handleStopRecording}
            />
          ) : (
            <IconButton
              icon="microphone"
              mode="contained"
              size={48}
              iconColor={theme.colors.onPrimary}
              containerColor={theme.colors.primary}
              onPress={handleStartRecording}
            />
          )}
          {isRecording && (
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.error, marginTop: 12 }}
            >
              Recording...
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.controls}>
          <IconButton
            icon={player.isPlaying ? "pause" : "play"}
            mode="contained-tonal"
            size={48}
            onPress={handlePlayback}
          />
          <View style={styles.actionButtons}>
            <Button
              title="Save"
              icon="content-save"
              onPress={handleUseRecording}
              style={styles.actionButton}
            />
            <Button
              title="Record"
              icon="microphone"
              onPress={handleReRecord}
              variant="outline"
              style={styles.actionButton}
            />
          </View>
        </View>
      )}

      <Button
        title="Cancel"
        onPress={handleCancel}
        variant="outline"
        style={styles.cancelButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    marginBottom: 32,
  },
  timer: {
    fontVariant: ["tabular-nums"],
    marginBottom: 48,
  },
  controls: {
    alignItems: "center",
    gap: 16,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    minWidth: 140,
  },
  cancelButton: {
    marginTop: 32,
    minWidth: 200,
  },
});
