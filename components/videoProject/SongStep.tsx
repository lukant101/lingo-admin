import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  StyledSnackbar,
  type SnackbarState,
} from "@/components/ui/StyledSnackbar";
import type { VideoProjectStepProps } from "@/components/videoProject/VideoProjectWizard";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import {
  generateVideoProjectSongStylePrompt,
  getVideoProjectSongStatus,
  startVideoProjectSong,
  updateVideoProject,
} from "@/lib/api/videoProjects";
import { getFileDownloadURL } from "@/lib/storage";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  IconButton,
  Text,
  useTheme,
} from "react-native-paper";

export function SongStep({ project, refresh }: VideoProjectStepProps) {
  const theme = useTheme();
  const [stylePrompt, setStylePrompt] = useState(project.songStylePrompt ?? "");
  const [instructions, setInstructions] = useState("");
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioPlayer = useAudioPlayer();

  useEffect(() => {
    setStylePrompt(project.songStylePrompt ?? "");
  }, [project.songStylePrompt]);

  useEffect(() => {
    audioPlayer.onComplete.current = () => setIsPlaying(false);
    return () => {
      audioPlayer.onComplete.current = null;
    };
  }, [audioPlayer.onComplete]);

  const onError = (err: Error) => {
    setSnackbar({ message: err.message || "Request failed", type: "error" });
  };

  // Polls the backend (which checks Suno) while a song is generating.
  const isGenerating = project.songStatus === "generating";
  const { data: polled } = useQuery({
    queryKey: ["videoProject", project.id, "songStatus"],
    queryFn: () => getVideoProjectSongStatus(project.id),
    enabled: isGenerating,
    refetchInterval: 5000,
  });
  useEffect(() => {
    if (polled && polled.songStatus !== "generating" && isGenerating) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polled?.songStatus]);

  const suggestMutation = useMutation({
    mutationFn: () =>
      generateVideoProjectSongStylePrompt(project.id, {
        instructions: instructions.trim() || undefined,
      }),
    onSuccess: () => refresh(),
    onError,
  });

  const startMutation = useMutation({
    mutationFn: () => startVideoProjectSong(project.id),
    onSuccess: () => refresh(),
    onError,
  });

  const handleStylePromptBlur = () => {
    if (stylePrompt.trim() === (project.songStylePrompt ?? "").trim()) return;
    updateVideoProject(project.id, { songStylePrompt: stylePrompt.trim() })
      .then(() => refresh())
      .catch(onError);
  };

  const togglePlay = async () => {
    if (!project.songPath) return;
    if (isPlaying) {
      await audioPlayer.stop();
      setIsPlaying(false);
      return;
    }
    const url = await getFileDownloadURL(project.songPath).catch(() => "");
    if (!url) return;
    setIsPlaying(true);
    await audioPlayer.play(url);
  };

  const canStart =
    !!project.script?.trim() &&
    !!stylePrompt.trim() &&
    !isGenerating &&
    !startMutation.isPending;

  return (
    <>
      <Card>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Song style
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}
        >
          The style prompt tells Suno what kind of music to compose for the
          lyrics. Let Gemini suggest one, then edit it as you like.
        </Text>
        <Input
          label="Style prompt"
          value={stylePrompt}
          onChangeText={setStylePrompt}
          onBlur={handleStylePromptBlur}
          multiline
          numberOfLines={2}
          maxLength={500}
          placeholder="e.g. upbeat acoustic pop, cheerful female vocals, ukulele, 100 bpm"
        />
        <Input
          label="Hints for Gemini (optional)"
          value={instructions}
          onChangeText={setInstructions}
          placeholder="e.g. should sound like a children's song"
        />
        <Button
          title="Suggest style with Gemini"
          onPress={() => suggestMutation.mutate()}
          loading={suggestMutation.isPending}
          disabled={suggestMutation.isPending || !project.script?.trim()}
          variant="secondary"
          icon="auto-fix"
        />
      </Card>

      <Card>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Song
        </Text>
        {!project.script?.trim() && (
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            Write the lyrics first.
          </Text>
        )}
        <Button
          title={
            project.songStatus === "completed"
              ? "Re-generate song"
              : "Generate song with Suno"
          }
          onPress={() => startMutation.mutate()}
          loading={startMutation.isPending}
          disabled={!canStart}
          icon="music"
        />

        {isGenerating && (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" />
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Suno is composing — this usually takes a few minutes. The status
              refreshes automatically.
            </Text>
          </View>
        )}

        {project.songStatus === "failed" && (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.error, marginTop: 8 }}
          >
            Song generation failed
            {project.songErrorCode ? `: ${project.songErrorCode}` : ""}. Try
            again.
          </Text>
        )}

        {project.songStatus === "completed" && project.songPath && (
          <View style={styles.statusRow}>
            <IconButton
              icon={isPlaying ? "stop" : "play"}
              onPress={togglePlay}
              accessibilityLabel="Play song"
            />
            <Text variant="bodyMedium">Preview the song</Text>
          </View>
        )}
      </Card>

      <StyledSnackbar snackbar={snackbar} onDismiss={() => setSnackbar(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
});
