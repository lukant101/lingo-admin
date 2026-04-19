import { View, StyleSheet } from "react-native";
import { Text, IconButton, useTheme } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import { Button } from "@/components/ui/Button";
import { UploadProgressBar } from "./UploadProgressBar";
import type { MediaUpload } from "@/types/submission";

type VideoPickerFieldProps = {
  media: MediaUpload | null;
  onVideoPicked: (
    uri: string,
    fileName: string,
    fileSize: number | null,
    mimeType: string | null,
    width: number | null,
    height: number | null,
    durationMs: number | null
  ) => void;
  onRemove: () => void;
  onClearError?: () => void;
};

function getDisplayName(media: MediaUpload): string {
  if (media.fileName) return media.fileName;
  if (media.gcsPath) {
    const segment = media.gcsPath.split("/").pop() ?? "Video uploaded";
    return segment;
  }
  if (media.uri) {
    return media.uri.split("/").pop() ?? "Video";
  }
  return "Video uploaded";
}

export function VideoPickerField({
  media,
  onVideoPicked,
  onRemove,
  onClearError,
}: VideoPickerFieldProps) {
  const theme = useTheme();

  const videoSource = media?.uri || null;
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = false;
  });

  const pickVideo = async () => {
    onClearError?.();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName =
        asset.fileName ?? asset.uri.split("/").pop() ?? "video.mp4";
      onVideoPicked(
        asset.uri,
        fileName,
        asset.fileSize ?? null,
        asset.mimeType ?? null,
        asset.width ?? null,
        asset.height ?? null,
        asset.duration != null ? asset.duration * 1000 : null
      );
    }
  };

  const hasVideo = media?.uri || media?.gcsPath;

  return (
    <View style={styles.container}>
      <Text
        variant="labelMedium"
        style={{ color: theme.colors.onSurfaceVariant }}
      >
        Video
      </Text>

      {hasVideo ? (
        <>
          {videoSource && (
            <View style={styles.previewContainer}>
              <VideoView
                style={styles.videoPreview}
                player={player}
                allowsFullscreen
                contentFit="contain"
              />
            </View>
          )}
          <View style={styles.videoInfo}>
            <Text variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>
              {getDisplayName(media!)}
            </Text>
            <IconButton
              icon="close"
              size={18}
              onPress={onRemove}
              iconColor={theme.colors.error}
            />
          </View>
        </>
      ) : (
        <Button title="Choose Video" onPress={pickVideo} variant="outline" />
      )}

      {media?.isUploading && (
        <UploadProgressBar
          progress={media.progress}
          label="Uploading video..."
        />
      )}

      {media?.error && (
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.error, marginTop: 8 }}
        >
          {media.error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  previewContainer: {
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  videoPreview: {
    width: "100%",
    height: "100%",
  },
  videoInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
