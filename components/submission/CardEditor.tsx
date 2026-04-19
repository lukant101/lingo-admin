import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { CardDraft } from "@/types/submission";
import { StyleSheet, View } from "react-native";
import { IconButton, Text, useTheme } from "react-native-paper";
import { UploadProgressBar } from "./UploadProgressBar";

type CardEditorProps = {
  card: CardDraft;
  index: number;
  onTextChange: (text: string) => void;
  onTextBlur?: () => void;
  onPickAudio: () => void;
  onRecordAudio?: () => void;
  onPlayAudio: () => void;
  onRemoveAudio: () => void;
  onRemoveCard: () => void;
  isPlaying: boolean;
  canRemove: boolean;
  showText?: boolean;
  audioLocked?: boolean;
};

const MAX_TEXT_LENGTH = 1000;

export function CardEditor({
  card,
  index,
  onTextChange,
  onTextBlur,
  onPickAudio,
  onRecordAudio,
  onPlayAudio,
  onRemoveAudio,
  onRemoveCard,
  isPlaying,
  canRemove,
  showText = true,
  audioLocked = false,
}: CardEditorProps) {
  const theme = useTheme();

  return (
    <View
      style={[styles.container, { borderColor: theme.colors.outlineVariant }]}
    >
      <View style={styles.header}>
        <Text variant="titleSmall">Card {index + 1}</Text>
        {canRemove && !audioLocked && (
          <IconButton
            icon="close"
            size={18}
            onPress={onRemoveCard}
            iconColor={theme.colors.error}
          />
        )}
      </View>

      {showText && (
        <>
          <Input
            label="Text"
            value={card.text}
            onChangeText={onTextChange}
            onBlur={onTextBlur}
            multiline
            numberOfLines={5}
            containerStyle={styles.textInput}
          />
          <Text
            variant="labelSmall"
            style={[
              styles.charCount,
              {
                color:
                  card.text.length > MAX_TEXT_LENGTH
                    ? theme.colors.error
                    : theme.colors.onSurfaceVariant,
              },
            ]}
          >
            {card.text.length}/{MAX_TEXT_LENGTH}
          </Text>
        </>
      )}

      <View style={styles.audioSection}>
        <Text
          variant="labelMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          Audio
        </Text>

        {card.audioUri || card.audioGcsPath ? (
          <View style={styles.audioControls}>
            <IconButton
              icon={isPlaying ? "stop" : "play"}
              mode="contained-tonal"
              size={20}
              onPress={onPlayAudio}
            />
            {!audioLocked && (
              <IconButton
                icon="close"
                size={18}
                onPress={onRemoveAudio}
                iconColor={theme.colors.error}
              />
            )}
          </View>
        ) : !audioLocked ? (
          <View style={styles.audioButtons}>
            <Button
              title="Pick File"
              onPress={onPickAudio}
              variant="outline"
              style={{ flex: 1 }}
            />
            {onRecordAudio && (
              <Button
                title="Record"
                onPress={onRecordAudio}
                variant="secondary"
                style={{ flex: 1 }}
              />
            )}
          </View>
        ) : null}

        {card.isUploading && (
          <UploadProgressBar
            progress={card.uploadProgress}
            label="Uploading audio..."
          />
        )}

        {card.error && (
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            {card.error}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textInput: {
    marginBottom: 0,
  },
  charCount: {
    textAlign: "right",
  },
  audioSection: {
    gap: 8,
  },
  audioControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  audioButtons: {
    flexDirection: "row",
    gap: 8,
  },
});
