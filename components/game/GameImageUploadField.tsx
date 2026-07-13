import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { IconButton, Text, useTheme } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";

import { Button } from "@/components/ui/Button";
import { UploadProgressBar } from "@/components/submission/UploadProgressBar";
import { resizeForCover, type ResizeResult } from "@/lib/imageProcessing";
import { getFileDownloadURL, uploadFileToStorage } from "@/lib/storage";
import { validateFile } from "@/lib/uploadValidation";
import type { MediaUpload } from "@/types/submission";

type GameImageUploadFieldProps = {
  label: string;
  aspectRatio: [number, number];
  /** When set, the picked image is resized/cropped like deck covers. */
  resizeVariant?: "horizontal" | "vertical";
  /** GCS path already stored on the draft (preview is resolved from it). */
  existingPath: string | null;
  buildGcsPath: (filename: string) => string;
  onUploaded: (gcsPath: string) => void | Promise<unknown>;
  onRemove: () => void | Promise<unknown>;
  disabled?: boolean;
};

export function GameImageUploadField({
  label,
  aspectRatio,
  resizeVariant,
  existingPath,
  buildGcsPath,
  onUploaded,
  onRemove,
  disabled,
}: GameImageUploadFieldProps) {
  const theme = useTheme();
  const [media, setMedia] = useState<MediaUpload | null>(null);
  const [existingUrl, setExistingUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!existingPath) {
      setExistingUrl(null);
      return;
    }
    getFileDownloadURL(existingPath)
      .then((url) => {
        if (!cancelled) setExistingUrl(url);
      })
      .catch(() => {
        if (!cancelled) setExistingUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [existingPath]);

  const pickAndUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: aspectRatio,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    const error = validateFile({
      category: "image",
      fileSize: asset.fileSize ?? null,
      mimeType: asset.mimeType ?? null,
      fileName: asset.fileName ?? asset.uri.split("/").pop() ?? null,
    });
    if (error) {
      setMedia({
        uri: "",
        gcsPath: null,
        progress: 0,
        isUploading: false,
        error,
      });
      return;
    }

    let uploadUri = asset.uri;
    let contentType = asset.mimeType ?? "image/jpeg";
    let ext = (asset.fileName ?? asset.uri).split(".").pop() ?? "jpg";

    if (resizeVariant) {
      let resizeResult: ResizeResult;
      try {
        resizeResult = await resizeForCover(
          asset.uri,
          resizeVariant,
          asset.width ?? null,
          asset.height ?? null,
          asset.mimeType ?? null
        );
      } catch {
        setMedia({
          uri: "",
          gcsPath: null,
          progress: 0,
          isUploading: false,
          error: "Failed to resize image",
        });
        return;
      }
      uploadUri = resizeResult.uri;
      contentType = `image/${resizeResult.format}`;
      ext = resizeResult.format === "jpeg" ? "jpg" : resizeResult.format;
    }

    const gcsPath = buildGcsPath(`image.${ext}`);

    setMedia({
      uri: uploadUri,
      gcsPath: null,
      progress: 0,
      isUploading: true,
      error: null,
    });

    try {
      await uploadFileToStorage({
        localUri: uploadUri,
        gcsPath,
        contentType,
        onProgress: (progress) => {
          setMedia({
            uri: uploadUri,
            gcsPath: null,
            progress,
            isUploading: true,
            error: null,
          });
        },
      });
      setMedia({
        uri: uploadUri,
        gcsPath,
        progress: 1,
        isUploading: false,
        error: null,
      });
      await onUploaded(gcsPath);
    } catch {
      setMedia({
        uri: uploadUri,
        gcsPath: null,
        progress: 0,
        isUploading: false,
        error: "Upload failed",
      });
    }
  };

  const handleRemove = async () => {
    setMedia(null);
    setExistingUrl(null);
    await onRemove();
  };

  const previewUri = media?.uri || existingUrl;

  return (
    <View style={styles.container}>
      <Text
        variant="labelMedium"
        style={{ color: theme.colors.onSurfaceVariant }}
      >
        {label}
      </Text>

      {previewUri ? (
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: previewUri }}
            style={[
              styles.preview,
              { aspectRatio: aspectRatio[0] / aspectRatio[1] },
            ]}
            resizeMode="cover"
          />
          {!disabled && (
            <IconButton
              icon="close-circle"
              size={24}
              onPress={handleRemove}
              style={styles.removeButton}
              iconColor={theme.colors.error}
            />
          )}
        </View>
      ) : (
        <Button
          title="Choose Image"
          onPress={pickAndUpload}
          variant="outline"
          disabled={disabled || media?.isUploading}
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
    gap: 12,
  },
  previewContainer: {
    position: "relative",
    alignSelf: "flex-start",
    width: "100%",
    maxWidth: 240,
  },
  preview: {
    width: "100%",
    borderRadius: 8,
  },
  removeButton: {
    position: "absolute",
    top: -8,
    right: -8,
  },
});
