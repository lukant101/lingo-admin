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
  MAX_AUDIO_DURATION_MS,
  MIN_AUDIO_DURATION_MS,
  validateFile,
} from "@/lib/uploadValidation";
import type { MediaUpload } from "@/types/submission";

type CardAudioUploadFieldProps = {
  label: string;
  /** CDN URL of the card's current clip. */
  existingUrl: string | null;
  buildGcsPath: (filename: string) => string;
  onUploaded: (gcsPath: string) => void;
  onRemove: () => void;
  disabled?: boolean;
};

/**
 * Self-uploading audio field for a single card on a published deck. The
 * per-card sibling of DeckAudioUploadField: same stage-then-save flow, but
 * bound to the tighter per-card limits (3 MB, 0.5–10 s) rather than the
 * whole-track ones, since these clips are one spoken line.
 */
export function CardAudioUploadField({
  label,
  existingUrl,
  buildGcsPath,
  onUploaded,
  onRemove,
  disabled = false,
}: CardAudioUploadFieldProps) {
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

  const stage = async (params: {
    uri: string;
    fileName: string;
    fileSize: number | null;
    mimeType: string | null;
  }) => {
    const { uri, fileName, fileSize, mimeType } = params;

    const error = validateFile({
      category: "audio",
      fileSize,
      mimeType,
      fileName,
    });
    if (error) return fail(error);

    // A failed probe resolves 0; don't reject on that.
    const durationMs = await getAudioDurationMs(uri);
    if (durationMs > 0 && durationMs < MIN_AUDIO_DURATION_MS) {
      return fail(
        `Audio too short (${(durationMs / 1000).toFixed(1)}s). Minimum is ${MIN_AUDIO_DURATION_MS / 1000} seconds.`
      );
    }
    if (durationMs > MAX_AUDIO_DURATION_MS) {
      return fail(
        `Audio too long (${(durationMs / 1000).toFixed(1)}s). Maximum is ${MAX_AUDIO_DURATION_MS / 1000} seconds.`
      );
    }

    const gcsPath = buildGcsPath(fileName);
    const rawMime = mimeType || getMimeType(fileName);
    // Some pickers report .m4a as video/mp4; store it as audio.
    const contentType = rawMime === "video/mp4" ? "audio/mp4" : rawMime;

    const progressState = (progress: number, isUploading: boolean) => ({
      uri,
      gcsPath: isUploading ? null : gcsPath,
      fileName,
      progress,
      isUploading,
      error: null,
    });

    setMedia(progressState(0, true));

    try {
      await uploadFileToStorage({
        localUri: uri,
        gcsPath,
        contentType,
        onProgress: (progress) => setMedia(progressState(progress, true)),
      });
      setMedia(progressState(1, false));
      onUploaded(gcsPath);
    } catch {
      fail("Upload failed");
    }
  };

  const pickAndUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: FILE_LIMITS.audio.allowedMimeTypes,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await stage({
      uri: asset.uri,
      fileName: asset.name ?? asset.uri.split("/").pop() ?? "audio.m4a",
      fileSize: asset.size ?? null,
      mimeType: asset.mimeType ?? null,
    });
  };

  const handleRemove = async () => {
    await player.stop();
    setMedia(null);
    onRemove();
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

  // A pending upload can be cancelled; audio already on the card can only be
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

      {hasAudio && (
        <View style={styles.row}>
          <IconButton
            icon={player.isPlaying ? "pause" : "play"}
            size={22}
            mode="contained-tonal"
            onPress={togglePlayback}
          />
          <Text variant="bodyMedium" numberOfLines={1} style={styles.fileName}>
            {media?.fileName ?? "Current audio"}
          </Text>
          {pending && !disabled && (
            <IconButton
              icon="close"
              size={18}
              onPress={handleRemove}
              iconColor={theme.colors.error}
            />
          )}
        </View>
      )}

      {!media?.isUploading && !disabled && (
        <Button
          title={hasAudio ? "Replace" : "Pick File"}
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
  fileName: {
    flex: 1,
  },
});
