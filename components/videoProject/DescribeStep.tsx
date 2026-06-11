import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  StyledSnackbar,
  type SnackbarState,
} from "@/components/ui/StyledSnackbar";
import {
  DESCRIPTION_TEMPLATES,
  PLATFORM_LABELS,
  PLATFORM_ORDER,
  renderTemplate,
} from "@/constants/videoDescriptionTemplates";
import { updateVideoProject } from "@/lib/api/videoProjects";
import type {
  VideoProjectDescriptions,
  VideoProjectPlatform,
} from "@/types/videoProject";
import type { VideoProjectStepProps } from "@/components/videoProject/VideoProjectWizard";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Chip, IconButton, Text, useTheme } from "react-native-paper";

export function DescribeStep({ project, refresh }: VideoProjectStepProps) {
  const theme = useTheme();
  const [title, setTitle] = useState(project.title);
  const [descriptions, setDescriptions] = useState<VideoProjectDescriptions>(
    project.descriptions
  );
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  const onError = (err: Error) => {
    setSnackbar({ message: err.message || "Failed to save", type: "error" });
  };

  const saveTitle = () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === project.title) return;
    updateVideoProject(project.id, { title: trimmed })
      .then(() => refresh())
      .catch(onError);
  };

  const saveDescriptions = (next: VideoProjectDescriptions) => {
    updateVideoProject(project.id, { descriptions: next })
      .then(() => refresh())
      .catch(onError);
  };

  const setDescription = (platform: VideoProjectPlatform, text: string) => {
    setDescriptions((current) => ({ ...current, [platform]: text }));
  };

  const applyTemplate = (
    platform: VideoProjectPlatform,
    templateId: string
  ) => {
    const template = DESCRIPTION_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const next = {
      ...descriptions,
      [platform]: renderTemplate(template, platform, title),
    };
    setDescriptions(next);
    saveDescriptions(next);
  };

  const copyDescription = async (platform: VideoProjectPlatform) => {
    const text = descriptions[platform];
    if (!text?.trim()) return;
    await Clipboard.setStringAsync(text);
    setSnackbar({
      message: `${PLATFORM_LABELS[platform]} description copied`,
      type: "success",
    });
  };

  return (
    <>
      <Card>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Video title
        </Text>
        <Input
          value={title}
          onChangeText={setTitle}
          onBlur={saveTitle}
          maxLength={200}
          placeholder="The title used on all platforms"
        />
      </Card>

      {PLATFORM_ORDER.map((platform) => (
        <Card key={platform}>
          <View style={styles.rowBetween}>
            <Text variant="titleMedium">{PLATFORM_LABELS[platform]}</Text>
            <IconButton
              icon="content-copy"
              onPress={() => copyDescription(platform)}
              disabled={!descriptions[platform]?.trim()}
              accessibilityLabel={`Copy ${PLATFORM_LABELS[platform]} description`}
            />
          </View>
          <View style={styles.chipRow}>
            {DESCRIPTION_TEMPLATES.map((template) => (
              <Chip
                key={template.id}
                compact
                icon="text-box-outline"
                onPress={() => applyTemplate(platform, template.id)}
              >
                {template.name}
              </Chip>
            ))}
          </View>
          <Input
            value={descriptions[platform] ?? ""}
            onChangeText={(text) => setDescription(platform, text)}
            onBlur={() => saveDescriptions(descriptions)}
            multiline
            numberOfLines={5}
            maxLength={5000}
            placeholder="Pick a template above or write the description"
          />
        </Card>
      ))}

      <Card>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          Tip: applying a template replaces the description for that platform.
          Templates fill in the video title and platform hashtags — edit the
          result freely.
        </Text>
        <View style={{ height: 8 }} />
        <Button
          title="Copy all descriptions"
          variant="outline"
          icon="content-copy"
          onPress={async () => {
            const all = PLATFORM_ORDER.filter((p) => descriptions[p]?.trim())
              .map((p) => `--- ${PLATFORM_LABELS[p]} ---\n${descriptions[p]}`)
              .join("\n\n");
            if (!all) return;
            await Clipboard.setStringAsync(all);
            setSnackbar({
              message: "All descriptions copied",
              type: "success",
            });
          }}
        />
      </Card>

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
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
});
