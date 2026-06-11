import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  StyledSnackbar,
  type SnackbarState,
} from "@/components/ui/StyledSnackbar";
import {
  deleteVideoProjectImage,
  generateVideoProjectImages,
  redoVideoProjectImage,
  updateVideoProjectImage,
} from "@/lib/api/videoProjects";
import { getFileDownloadURL } from "@/lib/storage";
import type {
  VideoProjectImage,
  VideoProjectImageStatus,
} from "@/types/videoProject";
import type { VideoProjectStepProps } from "@/components/videoProject/VideoProjectWizard";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import {
  Chip,
  Dialog,
  IconButton,
  Portal,
  SegmentedButtons,
  Text,
  useTheme,
} from "react-native-paper";

const STATUS_META: Record<
  VideoProjectImageStatus,
  { label: string; icon: string }
> = {
  pending: { label: "Pending", icon: "clock-outline" },
  approved: { label: "Approved", icon: "check-circle" },
  redo: { label: "Redo", icon: "refresh" },
};

function useImageUrls(images: VideoProjectImage[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const missing = images.filter((img) => !urls[img.path]);
    if (missing.length === 0) return;
    Promise.all(
      missing.map(async (img) => {
        const url = await getFileDownloadURL(img.path).catch(() => "");
        return [img.path, url] as const;
      })
    ).then((entries) => {
      if (cancelled) return;
      setUrls((current) => ({
        ...current,
        ...Object.fromEntries(entries.filter(([, url]) => !!url)),
      }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  return urls;
}

export function ImagesStep({ project, refresh }: VideoProjectStepProps) {
  const theme = useTheme();
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState("2");
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);
  const [redoTarget, setRedoTarget] = useState<VideoProjectImage | null>(null);
  const [redoComments, setRedoComments] = useState("");

  const urls = useImageUrls(project.images);

  const onError = (err: Error) => {
    setSnackbar({ message: err.message || "Request failed", type: "error" });
  };

  const generateMutation = useMutation({
    mutationFn: () =>
      generateVideoProjectImages(project.id, {
        prompt: prompt.trim(),
        count: Number(count),
      }),
    onSuccess: () => {
      setPrompt("");
      refresh();
    },
    onError,
  });

  const approveMutation = useMutation({
    mutationFn: (imageId: string) =>
      updateVideoProjectImage(project.id, imageId, { status: "approved" }),
    onSuccess: () => refresh(),
    onError,
  });

  const redoMutation = useMutation({
    mutationFn: ({
      imageId,
      comments,
    }: {
      imageId: string;
      comments: string;
    }) =>
      redoVideoProjectImage(project.id, imageId, {
        comments: comments.trim() || undefined,
      }),
    onSuccess: () => {
      setRedoTarget(null);
      setRedoComments("");
      refresh();
    },
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) =>
      deleteVideoProjectImage(project.id, imageId),
    onSuccess: () => refresh(),
    onError,
  });

  const approvedCount = project.images.filter(
    (img) => img.status === "approved"
  ).length;
  const busy =
    generateMutation.isPending ||
    redoMutation.isPending ||
    approveMutation.isPending ||
    deleteMutation.isPending;

  return (
    <>
      <Card>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Generate illustrations
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}
        >
          Vertical illustrations based on the script — never photorealistic.
          Describe the shot, generate 1–4 at a time, then approve or redo each
          one. You decide how many shots are enough.
        </Text>
        <Input
          label="Shot description"
          value={prompt}
          onChangeText={setPrompt}
          multiline
          numberOfLines={3}
          placeholder="e.g. Two friends greeting each other outside a small cafe on a sunny morning"
        />
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}
        >
          Number of images
        </Text>
        <SegmentedButtons
          value={count}
          onValueChange={setCount}
          buttons={[
            { value: "1", label: "1" },
            { value: "2", label: "2" },
            { value: "3", label: "3" },
            { value: "4", label: "4" },
          ]}
          style={styles.countToggle}
        />
        <Button
          title={generateMutation.isPending ? "Generating…" : "Generate images"}
          onPress={() => generateMutation.mutate()}
          loading={generateMutation.isPending}
          disabled={!prompt.trim() || busy}
          icon="image-plus"
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
            This can take a minute — keep this screen open.
          </Text>
        )}
      </Card>

      <Card>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Shots ({approvedCount} approved)
        </Text>
        {project.images.length === 0 ? (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            No images yet.
          </Text>
        ) : (
          <View style={styles.grid}>
            {project.images.map((img) => (
              <ImageTile
                key={img.id}
                image={img}
                url={urls[img.path]}
                busy={busy}
                onApprove={() => approveMutation.mutate(img.id)}
                onRedo={() => {
                  setRedoTarget(img);
                  setRedoComments(img.comments ?? "");
                }}
                onDelete={() => deleteMutation.mutate(img.id)}
              />
            ))}
          </View>
        )}
      </Card>

      <Portal>
        <Dialog
          visible={redoTarget != null}
          onDismiss={() => setRedoTarget(null)}
        >
          <Dialog.Title>Redo image</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ marginBottom: 12 }}>
              A new image is generated from the same shot description. Add
              comments on what to change (optional).
            </Text>
            <Input
              label="What to change"
              value={redoComments}
              onChangeText={setRedoComments}
              multiline
              numberOfLines={3}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setRedoTarget(null)}
            />
            <Button
              title="Generate redo"
              loading={redoMutation.isPending}
              onPress={() =>
                redoTarget &&
                redoMutation.mutate({
                  imageId: redoTarget.id,
                  comments: redoComments,
                })
              }
            />
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <StyledSnackbar snackbar={snackbar} onDismiss={() => setSnackbar(null)} />
    </>
  );
}

function ImageTile({
  image,
  url,
  busy,
  onApprove,
  onRedo,
  onDelete,
}: {
  image: VideoProjectImage;
  url?: string;
  busy: boolean;
  onApprove: () => void;
  onRedo: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const meta = STATUS_META[image.status];

  return (
    <View style={[styles.tile, { borderColor: theme.colors.outlineVariant }]}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={[styles.tileImage, image.status === "redo" && styles.dimmed]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.tileImage,
            styles.tilePlaceholder,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <MaterialCommunityIcons
            name="image-outline"
            size={32}
            color={theme.colors.onSurfaceVariant}
          />
        </View>
      )}
      <View style={styles.tileFooter}>
        <Chip
          compact
          icon={meta.icon}
          style={styles.statusChip}
          textStyle={styles.statusChipText}
        >
          {meta.label}
        </Chip>
        <View style={styles.tileActions}>
          {image.status !== "approved" && (
            <IconButton
              icon="check"
              size={18}
              disabled={busy}
              onPress={onApprove}
              accessibilityLabel="Approve image"
            />
          )}
          <IconButton
            icon="refresh"
            size={18}
            disabled={busy}
            onPress={onRedo}
            accessibilityLabel="Redo image"
          />
          <IconButton
            icon="delete-outline"
            size={18}
            disabled={busy}
            onPress={onDelete}
            accessibilityLabel="Delete image"
          />
        </View>
      </View>
      <Text
        variant="labelSmall"
        numberOfLines={2}
        style={{ color: theme.colors.onSurfaceVariant }}
      >
        {image.prompt}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginBottom: 8,
  },
  countToggle: {
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  tile: {
    width: 180,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    gap: 4,
  },
  tileImage: {
    width: "100%",
    aspectRatio: 9 / 16,
    borderRadius: 6,
  },
  dimmed: {
    opacity: 0.4,
  },
  tilePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  tileFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusChip: {
    flexShrink: 1,
  },
  statusChipText: {
    fontSize: 11,
  },
  tileActions: {
    flexDirection: "row",
  },
});
