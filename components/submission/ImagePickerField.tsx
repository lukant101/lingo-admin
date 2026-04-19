import { View, StyleSheet, Image } from "react-native";
import { Text, IconButton, useTheme } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { Button } from "@/components/ui/Button";
import { UploadProgressBar } from "./UploadProgressBar";
import type { MediaUpload } from "@/types/submission";

type ImagePickerFieldProps = {
  label: string;
  aspectRatio: [number, number];
  media: MediaUpload | null;
  onImagePicked: (
    uri: string,
    fileSize: number | null,
    mimeType: string | null,
    width: number | null,
    height: number | null
  ) => void;
  onRemove: () => void;
};

export function ImagePickerField({
  label,
  aspectRatio,
  media,
  onImagePicked,
  onRemove,
}: ImagePickerFieldProps) {
  const theme = useTheme();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: aspectRatio,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      onImagePicked(
        asset.uri,
        asset.fileSize ?? null,
        asset.mimeType ?? null,
        asset.width ?? null,
        asset.height ?? null
      );
    }
  };

  const hasImage = media?.uri || media?.gcsPath;

  return (
    <View style={styles.container}>
      <Text
        variant="labelMedium"
        style={{ color: theme.colors.onSurfaceVariant }}
      >
        {label}
      </Text>

      {hasImage && media?.uri ? (
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: media.uri }}
            style={[
              styles.preview,
              { aspectRatio: aspectRatio[0] / aspectRatio[1] },
            ]}
            resizeMode="cover"
          />
          <IconButton
            icon="close-circle"
            size={24}
            onPress={onRemove}
            style={styles.removeButton}
            iconColor={theme.colors.error}
          />
        </View>
      ) : (
        <Button title="Choose Image" onPress={pickImage} variant="outline" />
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
