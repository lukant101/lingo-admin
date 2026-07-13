import { type ReactNode, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Chip, IconButton, Text, useTheme } from "react-native-paper";

import { ExternalLink } from "@/components/ExternalLink";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { GEMINI_VOICES, type VoiceGender } from "@/types/game";

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
  /** Image area — an upload field for both drafts and published games. */
  imageSlot: ReactNode;
  onField: (field: keyof CharacterFields, value: string) => void;
  /** Called on text-field blur so the parent can persist changes. */
  onCommit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  disabled?: boolean;
};

const GENDER_OPTIONS = [
  { label: "Female", value: "female" },
  { label: "Male", value: "male" },
];

const voiceOptionsFor = (gender: VoiceGender) =>
  GEMINI_VOICES.filter((voice) => voice.gender === gender).map((voice) => ({
    label: `${voice.name} — ${voice.style}`,
    value: voice.name,
  }));

// Gender is derived from the selected voice rather than stored — every voice
// has a known gender, so nothing needs persisting.
const genderOfVoice = (voiceName: string): VoiceGender =>
  GEMINI_VOICES.find((voice) => voice.name === voiceName)?.gender ?? "female";

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
            label="Voice gender"
            options={GENDER_OPTIONS}
            value={genderOfVoice(character.voiceName)}
            onValueChange={(value) => {
              const gender = value as VoiceGender;
              if (gender === genderOfVoice(character.voiceName)) return;
              // Switching gender picks the first voice of that gender so the
              // selection is never inconsistent with the dropdown below.
              const first = GEMINI_VOICES.find((v) => v.gender === gender);
              if (first) {
                onField("voiceName", first.name);
                onCommit();
              }
            }}
          />
          <Select
            label="Voice"
            options={voiceOptionsFor(genderOfVoice(character.voiceName))}
            value={character.voiceName}
            onValueChange={(value) => {
              onField("voiceName", value);
              onCommit();
            }}
          />
          <ExternalLink href="https://docs.cloud.google.com/text-to-speech/docs/gemini-tts">
            <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
              Preview voices in Google&apos;s Gemini TTS docs
            </Text>
          </ExternalLink>
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
