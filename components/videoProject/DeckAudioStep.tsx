import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  StyledSnackbar,
  type SnackbarState,
} from "@/components/ui/StyledSnackbar";
import type { VideoProjectStepProps } from "@/components/videoProject/VideoProjectWizard";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { generateVideoProjectDeckAudio } from "@/lib/api/videoProjects";
import { getFileDownloadURL } from "@/lib/storage";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { IconButton, Text, useTheme } from "react-native-paper";

export function DeckAudioStep({ project, refresh }: VideoProjectStepProps) {
  const theme = useTheme();
  const [voiceName, setVoiceName] = useState("");
  const [secondVoiceName, setSecondVoiceName] = useState("");
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioPlayer = useAudioPlayer();

  useEffect(() => {
    audioPlayer.onComplete.current = () => setIsPlaying(false);
    return () => {
      audioPlayer.onComplete.current = null;
    };
  }, [audioPlayer.onComplete]);

  const generateMutation = useMutation({
    mutationFn: () =>
      generateVideoProjectDeckAudio(project.id, {
        voiceName: voiceName.trim() || undefined,
        secondVoiceName: secondVoiceName.trim() || undefined,
      }),
    onSuccess: () => refresh(),
    onError: (err: Error) => {
      setSnackbar({ message: err.message || "Request failed", type: "error" });
    },
  });

  const togglePlay = async () => {
    if (!project.deckAudioPath) return;
    if (isPlaying) {
      await audioPlayer.stop();
      setIsPlaying(false);
      return;
    }
    const url = await getFileDownloadURL(project.deckAudioPath).catch(() => "");
    if (!url) return;
    setIsPlaying(true);
    await audioPlayer.play(url);
  };

  return (
    <>
      <Card>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Deck audio
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}
        >
          Multi-speaker Gemini TTS reads the whole dialogue (up to 2 speakers)
          and the clip is converted to stereo. This is the audio for the full
          video.
        </Text>
        {!project.script?.trim() ? (
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            Write the script first.
          </Text>
        ) : (
          <>
            <Input
              label="Voice for speaker 1 (optional)"
              value={voiceName}
              onChangeText={setVoiceName}
              placeholder="Kore"
            />
            <Input
              label="Voice for speaker 2 (optional)"
              value={secondVoiceName}
              onChangeText={setSecondVoiceName}
              placeholder="Puck"
            />
            <Button
              title={
                project.deckAudioPath
                  ? "Re-generate deck audio"
                  : "Generate deck audio"
              }
              onPress={() => generateMutation.mutate()}
              loading={generateMutation.isPending}
              disabled={generateMutation.isPending}
              icon="text-to-speech"
            />
            {generateMutation.isPending && (
              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                Generating speech — this can take a minute.
              </Text>
            )}
          </>
        )}
      </Card>

      {project.deckAudioPath && (
        <Card>
          <View style={styles.row}>
            <IconButton
              icon={isPlaying ? "stop" : "play"}
              onPress={togglePlay}
              accessibilityLabel="Play deck audio"
            />
            <Text variant="bodyMedium">Preview the deck audio</Text>
          </View>
        </Card>
      )}

      <StyledSnackbar snackbar={snackbar} onDismiss={() => setSnackbar(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
});
