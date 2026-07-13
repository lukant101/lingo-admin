import { type ReactNode, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Chip, IconButton, Text, useTheme } from "react-native-paper";

import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { GEMINI_VOICES } from "@/types/game";

export type CharacterFields = {
  slug: string;
  name: string;
  intro: string;
  voiceName: string;
  systemPrompt: string;
};

type CharacterCardProps = {
  index: number;
  count: number;
  character: CharacterFields;
  /** Image area — an upload field for drafts, a read-only preview for
   * published games. */
  imageSlot: ReactNode;
  onField: (field: keyof CharacterFields, value: string) => void;
  /** Called on text-field blur so the parent can persist changes. */
  onCommit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  disabled?: boolean;
};

const VOICE_OPTIONS = GEMINI_VOICES.map((voice) => ({
  label: voice,
  value: voice,
}));

export function CharacterCard({
  index,
  count,
  character,
  imageSlot,
  onField,
  onCommit,
  onMoveUp,
  onMoveDown,
  onDelete,
  disabled,
}: CharacterCardProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(!character.name);

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text
            variant="titleSmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            #{index + 1}
          </Text>
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurface }}
            numberOfLines={1}
          >
            {character.name || "New character"}
          </Text>
          {index === 0 && (
            <Chip mode="flat" compact>
              entry
            </Chip>
          )}
        </View>
        <View style={styles.headerActions}>
          <IconButton
            icon="arrow-up"
            size={18}
            disabled={disabled || index === 0}
            onPress={onMoveUp}
          />
          <IconButton
            icon="arrow-down"
            size={18}
            disabled={disabled || index === count - 1}
            onPress={onMoveDown}
          />
          <IconButton
            icon="delete-outline"
            size={18}
            disabled={disabled || count === 1}
            iconColor={theme.colors.error}
            onPress={onDelete}
          />
          <IconButton
            icon={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            onPress={() => setExpanded((v) => !v)}
          />
        </View>
      </View>

      {expanded && (
        <View style={styles.body}>
          <Input
            label="Name"
            value={character.name}
            onChangeText={(text) => onField("name", text)}
            onBlur={onCommit}
            placeholder="Character name"
            maxLength={200}
            editable={!disabled}
          />
          <Input
            label="Slug (lowercase letters, digits, underscores)"
            value={character.slug}
            onChangeText={(text) => onField("slug", text)}
            onBlur={onCommit}
            placeholder="e.g. waiter"
            maxLength={100}
            autoCapitalize="none"
            editable={!disabled}
          />
          {imageSlot}
          <Input
            label="Intro (shown to the learner when meeting the character)"
            value={character.intro}
            onChangeText={(text) => onField("intro", text)}
            onBlur={onCommit}
            multiline
            numberOfLines={3}
            maxLength={2000}
            editable={!disabled}
          />
          <Select
            label="Voice"
            options={VOICE_OPTIONS}
            value={character.voiceName}
            onValueChange={(value) => {
              onField("voiceName", value);
              onCommit();
            }}
          />
          <Input
            label="System prompt (drives the character's behavior)"
            value={character.systemPrompt}
            onChangeText={(text) => onField("systemPrompt", text)}
            onBlur={onCommit}
            multiline
            numberOfLines={10}
            maxLength={20000}
            editable={!disabled}
          />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  body: {
    marginTop: 12,
    gap: 4,
  },
});
