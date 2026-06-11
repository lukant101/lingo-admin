import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  StyledSnackbar,
  type SnackbarState,
} from "@/components/ui/StyledSnackbar";
import { exportVideoProject } from "@/lib/api/videoProjects";
import type { VideoProjectStepProps } from "@/components/videoProject/VideoProjectWizard";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

export function ExportStep({ project, refresh }: VideoProjectStepProps) {
  const theme = useTheme();
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);
  void refresh;

  const approvedImages = project.images.filter(
    (img) => img.status === "approved"
  ).length;
  const cardClips = project.cards.filter((c) => c.audioPath).length;
  const descriptionsCount = Object.values(project.descriptions).filter(
    (d) => !!d?.trim()
  ).length;

  const items: { label: string; done: boolean }[] = [
    { label: "Script", done: !!project.script?.trim() },
    {
      label: `Card audio clips (${cardClips}/${project.cards.length})`,
      done: project.cards.length > 0 && cardClips === project.cards.length,
    },
    { label: `Approved images (${approvedImages})`, done: approvedImages > 0 },
    project.kind === "dialogue"
      ? { label: "Deck audio", done: !!project.deckAudioPath }
      : {
          label: "Song",
          done: project.songStatus === "completed" && !!project.songPath,
        },
    {
      label: `Platform descriptions (${descriptionsCount}/3)`,
      done: descriptionsCount > 0,
    },
  ];

  const exportMutation = useMutation({
    mutationFn: () => exportVideoProject(project.id),
    onSuccess: (result) => {
      setSnackbar({
        message: `ZIP with ${result.fileCount} files ready — download started`,
        type: "success",
      });
      Linking.openURL(result.url).catch(() => {
        setSnackbar({
          message: "Could not open the download link",
          type: "error",
        });
      });
    },
    onError: (err: Error) => {
      setSnackbar({ message: err.message || "Export failed", type: "error" });
    },
  });

  const hasAnything = items.some((item) => item.done);

  return (
    <>
      <Card>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Export assets
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}
        >
          Download a ZIP with everything needed to edit the video: approved
          images, card audio clips, the{" "}
          {project.kind === "dialogue" ? "deck audio" : "song"}, plus the
          script, card texts, title, and descriptions as text files.
        </Text>

        {items.map((item) => (
          <View key={item.label} style={styles.checkRow}>
            <MaterialCommunityIcons
              name={item.done ? "check-circle" : "circle-outline"}
              size={18}
              color={
                item.done ? theme.colors.primary : theme.colors.onSurfaceVariant
              }
            />
            <Text
              variant="bodyMedium"
              style={{
                color: item.done
                  ? theme.colors.onSurface
                  : theme.colors.onSurfaceVariant,
              }}
            >
              {item.label}
            </Text>
          </View>
        ))}

        <View style={{ height: 16 }} />
        <Button
          title={
            exportMutation.isPending ? "Building ZIP…" : "Build & download ZIP"
          }
          onPress={() => exportMutation.mutate()}
          loading={exportMutation.isPending}
          disabled={!hasAnything || exportMutation.isPending}
          icon="folder-zip-outline"
        />
        <Text
          variant="bodySmall"
          style={{
            color: theme.colors.onSurfaceVariant,
            textAlign: "center",
            marginTop: 8,
          }}
        >
          Edit the video in your editor, then upload the result through the
          Platform Decks flow.
        </Text>
      </Card>

      <StyledSnackbar snackbar={snackbar} onDismiss={() => setSnackbar(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginBottom: 8,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
});
