import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  StyledSnackbar,
  type SnackbarState,
} from "@/components/ui/StyledSnackbar";
import { WaveformCutEditor } from "@/components/videoProject/WaveformCutEditor";
import type { VideoProjectStepProps } from "@/components/videoProject/VideoProjectWizard";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import {
  generateVideoProjectCardAudio,
  splitVideoProjectCardAudio,
} from "@/lib/api/videoProjects";
import { getFileDownloadURL } from "@/lib/storage";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { IconButton, Text, useTheme } from "react-native-paper";

export function CardAudioStep({ project, refresh }: VideoProjectStepProps) {
  const theme = useTheme();
  const [voiceName, setVoiceName] = useState("");
  const [cutPoints, setCutPoints] = useState<number[]>(
    project.cutPoints ?? project.suggestedCutPoints ?? []
  );
  const [sourceUrl, setSourceUrl] = useState("");
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const audioPlayer = useAudioPlayer();

  const sourceKey = `${project.cardAudioSourcePath}|${(
    project.suggestedCutPoints ?? []
  ).join(",")}`;

  useEffect(() => {
    setCutPoints(project.cutPoints ?? project.suggestedCutPoints ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);

  useEffect(() => {
    let cancelled = false;
    setSourceUrl("");
    if (project.cardAudioSourcePath) {
      getFileDownloadURL(project.cardAudioSourcePath)
        .then((url) => {
          if (!cancelled) setSourceUrl(url);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [project.cardAudioSourcePath]);

  useEffect(() => {
    audioPlayer.onComplete.current = () => setPlayingKey(null);
    return () => {
      audioPlayer.onComplete.current = null;
    };
  }, [audioPlayer.onComplete]);

  const onError = (err: Error) => {
    setSnackbar({ message: err.message || "Request failed", type: "error" });
  };

  const generateMutation = useMutation({
    mutationFn: () =>
      generateVideoProjectCardAudio(project.id, {
        voiceName: voiceName.trim() || undefined,
      }),
    onSuccess: () => refresh(),
    onError,
  });

  const splitMutation = useMutation({
    mutationFn: () => splitVideoProjectCardAudio(project.id, { cutPoints }),
    onSuccess: () => refresh(),
    onError,
  });

  const togglePlay = async (key: string, path: string | null) => {
    if (!path) return;
    if (playingKey === key) {
      await audioPlayer.stop();
      setPlayingKey(null);
      return;
    }
    await audioPlayer.stop();
    const url =
      key === "source" && sourceUrl
        ? sourceUrl
        : await getFileDownloadURL(path).catch(() => "");
    if (!url) return;
    setPlayingKey(key);
    await audioPlayer.play(url);
  };

  const expectedCuts = Math.max(0, project.cards.length - 1);
  const canSplit =
    !!project.cardAudioSourcePath &&
    cutPoints.length === expectedCuts &&
    !splitMutation.isPending &&
    !generateMutation.isPending;
  const splitDone =
    project.cards.length > 0 && project.cards.every((c) => c.audioPath);

  return (
    <>
      <Card>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Card audio
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}
        >
          One Gemini TTS clip is generated for all {project.cards.length} cards,
          converted to stereo, then cut into one clip per card. Cut points are
          suggested at the silences — adjust them before splitting.
        </Text>
        {project.cards.length === 0 ? (
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            Add cards in the script step first.
          </Text>
        ) : (
          <>
            <Input
              label="Voice (optional)"
              value={voiceName}
              onChangeText={setVoiceName}
              placeholder="Kore"
            />
            <Button
              title={
                project.cardAudioSourcePath
                  ? "Re-generate card audio"
                  : "Generate card audio"
              }
              onPress={() => generateMutation.mutate()}
              loading={generateMutation.isPending}
              disabled={generateMutation.isPending || splitMutation.isPending}
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

      {project.cardAudioSourcePath && (
        <Card>
          <View style={styles.rowBetween}>
            <Text variant="titleMedium">Cut points</Text>
            <IconButton
              icon={playingKey === "source" ? "stop" : "play"}
              onPress={() => togglePlay("source", project.cardAudioSourcePath)}
              accessibilityLabel="Play full clip"
            />
          </View>
          {sourceUrl ? (
            <WaveformCutEditor
              url={sourceUrl}
              cutPoints={cutPoints}
              onChange={setCutPoints}
            />
          ) : (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Loading audio…
            </Text>
          )}
          {cutPoints.length !== expectedCuts && (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.error, marginTop: 8 }}
            >
              {expectedCuts} cut points are needed for {project.cards.length}{" "}
              cards, but {cutPoints.length} were detected. Re-generate the audio
              or adjust the cards.
            </Text>
          )}
          <View style={{ height: 12 }} />
          <Button
            title={
              splitDone ? "Re-split into card clips" : "Split into card clips"
            }
            onPress={() => splitMutation.mutate()}
            loading={splitMutation.isPending}
            disabled={!canSplit}
            icon="content-cut"
          />
        </Card>
      )}

      {splitDone && (
        <Card>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Card clips
          </Text>
          {project.cards.map((card, i) => (
            <View key={card.id} style={styles.cardRow}>
              <IconButton
                icon={playingKey === card.id ? "stop" : "play"}
                onPress={() => togglePlay(card.id, card.audioPath)}
                accessibilityLabel={`Play card ${i + 1}`}
              />
              <Text variant="bodySmall" numberOfLines={2} style={{ flex: 1 }}>
                {i + 1}. {card.text}
              </Text>
            </View>
          ))}
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
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
