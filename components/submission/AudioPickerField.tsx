import { Button } from "@/components/ui/Button";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { FILE_LIMITS } from "@/lib/uploadValidation";
import type { MediaUpload } from "@/types/submission";
import * as DocumentPicker from "expo-document-picker";
import { StyleSheet, View } from "react-native";
import { IconButton, Text, useTheme } from "react-native-paper";
import { UploadProgressBar } from "./UploadProgressBar";

type AudioPickerFieldProps = {
  media: MediaUpload | null;
  onAudioPicked: (
    uri: string,
    fileName: string,
    fileSize: number | null,
    mimeType: string | null
  ) => void;
  onRemove: () => void;
  onClearError?: () => void;
};

function getDisplayName(media: MediaUpload): string {
  if (media.fileName) return media.fileName;
  if (media.gcsPath) return media.gcsPath.split("/").pop() ?? "Audio uploaded";
  if (media.uri) return media.uri.split("/").pop() ?? "Audio";
  return "Audio uploaded";
}

export function AudioPickerField({
  media,
  onAudioPicked,
  onRemove,
  onClearError,
}: AudioPickerFieldProps) {
  const theme = useTheme();
  const player = useAudioPlayer();

  const pickAudio = async () => {
    onClearError?.();
    const result = await DocumentPicker.getDocumentAsync({
      type: FILE_LIMITS.deckAudio.allowedMimeTypes,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const fileName = asset.name ?? asset.uri.split("/").pop() ?? "audio.m4a";
    onAudioPicked(
      asset.uri,
      fileName,
      asset.size ?? null,
      asset.mimeType ?? null
    );
  };

  const togglePlayback = async () => {
    if (!media?.uri) return;
    if (player.isPlaying) {
      await player.pause();
    } else {
      await player.play(media.uri);
    }
  };

  const hasAudio = media?.uri || media?.gcsPath;

  return (
    <View style={styles.container}>
      <Text
        variant="labelMedium"
        style={{ color: theme.colors.onSurfaceVariant }}
      >
        Audio
      </Text>

      {hasAudio ? (
        <View style={styles.audioInfo}>
          {media?.uri ? (
            <IconButton
              icon={player.isPlaying ? "pause" : "play"}
              size={22}
              mode="contained-tonal"
              onPress={togglePlayback}
            />
          ) : null}
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
      ) : (
        <Button title="Choose Audio" onPress={pickAudio} variant="outline" />
      )}

      {media?.isUploading && (
        <UploadProgressBar
          progress={media.progress}
          label="Uploading audio..."
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
  audioInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
