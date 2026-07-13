import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { IconButton, Text, useTheme } from "react-native-paper";

import { UploadProgressBar } from "@/components/submission/UploadProgressBar";
import { Button } from "@/components/ui/Button";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { getAudioDurationMs } from "@/lib/audioDuration";
import { getMimeType, uploadFileToStorage } from "@/lib/storage";
import {
  FILE_LIMITS,
  MAX_DECK_AUDIO_DURATION_MS,
  MIN_DECK_AUDIO_DURATION_MS,
  validateFile,
} from "@/lib/uploadValidation";
import type { MediaUpload } from "@/types/submission";

type DeckAudioUploadFieldProps = {
  label: string;
  /** CDN URL of the deck's current audio, if it has any. */
  existingUrl: string | null;
  buildGcsPath: (filename: string) => string;
  onUploaded: (gcsPath: string) => void | Promise<unknown>;
  onRemove: () => void | Promise<unknown>;
};

/**
 * Self-uploading audio field for the published-deck editor: picks a file,
 * validates it, uploads to the mates bucket and hands back the staged path.
 * Mirrors GameImageUploadField — the wizard's AudioPickerField is controlled
 * by its parent, which doesn't fit this form's stage-then-save flow.
 */
export function DeckAudioUploadField({
  label,
  existingUrl,
  buildGcsPath,
  onUploaded,
  onRemove,
}: DeckAudioUploadFieldProps) {
  const theme = useTheme();
  const player = useAudioPlayer();
  const [media, setMedia] = useState<MediaUpload | null>(null);

  const fail = (error: string) =>
    setMedia({
      uri: "",
      gcsPath: null,
      progress: 0,
      isUploading: false,
      error,
    });

  const pickAndUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: FILE_LIMITS.deckAudio.allowedMimeTypes,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const fileName = asset.name ?? asset.uri.split("/").pop() ?? "audio.m4a";

    const error = validateFile({
      category: "deckAudio",
      fileSize: asset.size ?? null,
      mimeType: asset.mimeType ?? null,
      fileName,
    });
    if (error) return fail(error);

    // A failed probe resolves 0; don't reject on that.
    const durationMs = await getAudioDurationMs(asset.uri);
    if (durationMs > 0 && durationMs < MIN_DECK_AUDIO_DURATION_MS) {
      return fail(
        `Audio too short (${(durationMs / 1000).toFixed(1)}s). Minimum is ${MIN_DECK_AUDIO_DURATION_MS / 1000} seconds.`
      );
    }
    if (durationMs > MAX_DECK_AUDIO_DURATION_MS) {
      return fail(
        `Audio too long (${(durationMs / 1000).toFixed(0)}s). Maximum is ${MAX_DECK_AUDIO_DURATION_MS / 1000 / 60} minutes.`
      );
    }

    const gcsPath = buildGcsPath(fileName);
    const rawMime = asset.mimeType || getMimeType(fileName);
    // Some pickers report .m4a as video/mp4; store it as audio.
    const contentType = rawMime === "video/mp4" ? "audio/mp4" : rawMime;

    setMedia({
      uri: asset.uri,
      gcsPath: null,
      fileName,
      progress: 0,
      isUploading: true,
      error: null,
    });

    try {
      await uploadFileToStorage({
        localUri: asset.uri,
        gcsPath,
        contentType,
        onProgress: (progress) =>
          setMedia({
            uri: asset.uri,
            gcsPath: null,
            fileName,
            progress,
            isUploading: true,
            error: null,
          }),
      });
      setMedia({
        uri: asset.uri,
        gcsPath,
        fileName,
        progress: 1,
        isUploading: false,
        error: null,
      });
      await onUploaded(gcsPath);
    } catch {
      fail("Upload failed");
    }
  };

  const handleRemove = async () => {
    await player.stop();
    setMedia(null);
    await onRemove();
  };

  const togglePlayback = async () => {
    const uri = media?.uri || existingUrl;
    if (!uri) return;
    if (player.isPlaying) {
      await player.pause();
    } else {
      await player.play(uri);
    }
  };

  // A pending upload can be cancelled; audio already on the deck can only be
  // replaced, so removing a pending upload reveals it again.
  const pending = media?.gcsPath ? media : null;
  const hasAudio = !!(pending || media?.uri || existingUrl);

  return (
    <View style={styles.container}>
      <Text
        variant="labelMedium"
        style={{ color: theme.colors.onSurfaceVariant }}
      >
        {label}
      </Text>

      {hasAudio ? (
        <View style={styles.row}>
          <IconButton
            icon={player.isPlaying ? "pause" : "play"}
            size={22}
            mode="contained-tonal"
            onPress={togglePlayback}
          />
          <Text variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>
            {media?.fileName ?? "Current audio"}
          </Text>
          {pending && (
            <IconButton
              icon="close"
              size={18}
              onPress={handleRemove}
              iconColor={theme.colors.error}
            />
          )}
        </View>
      ) : null}

      {!media?.isUploading && (
        <Button
          title={hasAudio ? "Replace Audio" : "Choose Audio"}
          onPress={pickAndUpload}
          variant="outline"
        />
      )}

      {media?.isUploading && (
        <UploadProgressBar progress={media.progress} label="Uploading..." />
      )}

      {media?.error && (
        <Text variant="bodySmall" style={{ color: theme.colors.error }}>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
