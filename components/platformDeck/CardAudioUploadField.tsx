import * as DocumentPicker from "expo-document-picker";
import { useEffect, useRef, useState } from "react";
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

/** A clip handed back by the record screen, ready to be staged. */
export type IncomingRecording = {
  uri: string;
  filename: string;
  durationMs: number;
};

type CardAudioUploadFieldProps = {
  label: string;
  /** CDN URL of the card's current clip. */
  existingUrl: string | null;
  buildGcsPath: (filename: string) => string;
  onUploaded: (gcsPath: string) => void;
  onRemove: () => void;
  /** Omit to hide the record button (e.g. where recording isn't reachable). */
  onRecord?: () => void;
  /** Staged as soon as it arrives; the parent clears it via onRecordingHandled. */
  incomingRecording?: IncomingRecording | null;
  onRecordingHandled?: () => void;
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
  onRecord,
  incomingRecording,
  onRecordingHandled,
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
    /** Known for recordings; probed for picked files. */
    durationMs?: number;
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
    const durationMs = params.durationMs ?? (await getAudioDurationMs(uri));
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

  // Recordings arrive from a separate screen rather than a picker callback, so
  // they land as a prop. Keyed on the uri so re-renders don't re-upload.
  const stagedRecordingUri = useRef<string | null>(null);
  useEffect(() => {
    if (!incomingRecording) return;
    if (stagedRecordingUri.current === incomingRecording.uri) return;
    stagedRecordingUri.current = incomingRecording.uri;

    void stage({
      uri: incomingRecording.uri,
      fileName: incomingRecording.filename,
      fileSize: null,
      mimeType: null,
      durationMs: incomingRecording.durationMs,
    }).then(() => onRecordingHandled?.());
    // stage closes over buildGcsPath/onUploaded, which are re-created each
    // render; the uri guard above is what keeps this from re-running.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingRecording]);

  const handleRemove = async () => {
    await player.stop();
    setMedia(null);
    stagedRecordingUri.current = null;
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
        <View style={styles.buttons}>
          <Button
            title={hasAudio ? "Replace" : "Pick File"}
            onPress={pickAndUpload}
            variant="outline"
            style={styles.button}
          />
          {onRecord && (
            <Button
              title="Record"
              onPress={onRecord}
              variant="secondary"
              style={styles.button}
            />
          )}
        </View>
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
  buttons: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
  },
});
