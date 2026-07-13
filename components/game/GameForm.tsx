import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { Dialog, Portal, Switch, Text, useTheme } from "react-native-paper";

import { CharacterCard } from "@/components/game/CharacterCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import {
  StyledSnackbar,
  type SnackbarState,
} from "@/components/ui/StyledSnackbar";
import { deleteGame, getGame, updateGame } from "@/lib/api/games";
import { DECK_LEVELS, DIALOG_MAX_WIDTH } from "@/lib/constants";
import { getVariantName } from "@/lib/languages";
import type { DeckLevel } from "@/types/langs";
import type { GameCharacterInput } from "@/types/game";

const SLUG_PATTERN = /^[a-z0-9_]+$/;

type GameFormProps = {
  gameId: string;
};

type EditableCharacter = {
  slug: string;
  name: string;
  imageUrl: string;
  intro: string;
  voiceName: string;
  systemPrompt: string;
};

type GameFields = {
  title: string;
  level: DeckLevel;
  setting: string;
  challenge: string;
  accomplishment: string;
  forKids: boolean;
  isPublished: boolean;
  sortOrderText: string;
};

const LEVEL_OPTIONS = DECK_LEVELS.map((level) => ({
  label: level,
  value: level,
}));

export function GameForm({ gameId }: GameFormProps) {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [snackbar, setSnackbar] = useState<SnackbarState>(null);
  const [fields, setFields] = useState<GameFields | null>(null);
  const [characters, setCharacters] = useState<EditableCharacter[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    data: game,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["adminGame", gameId],
    queryFn: () => getGame(gameId),
  });

  useEffect(() => {
    if (!game || fields !== null) return;
    setFields({
      title: game.title,
      level: game.level,
      setting: game.setting,
      challenge: game.challenge,
      accomplishment: game.accomplishment,
      forKids: game.forKids,
      isPublished: game.isPublished,
      sortOrderText: game.sortOrder != null ? String(game.sortOrder) : "",
    });
    setCharacters(
      game.characters.map((c) => ({
        slug: c.slug,
        name: c.name,
        imageUrl: c.imageUrl,
        intro: c.intro,
        voiceName: c.voiceName,
        systemPrompt: c.systemPrompt,
      }))
    );
  }, [game, fields]);

  const setField = <K extends keyof GameFields>(
    key: K,
    value: GameFields[K]
  ) => {
    setFields((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const setCharacterField = (
    index: number,
    field: keyof Omit<EditableCharacter, "imageUrl">,
    value: string
  ) => {
    setCharacters((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const moveCharacter = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= characters.length) return;
    setCharacters((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const validate = (): string | null => {
    if (!fields) return "Not loaded";
    if (!fields.title.trim()) return "Title is required";
    if (!fields.setting.trim()) return "Setting is required";
    if (!fields.challenge.trim()) return "Challenge is required";
    if (characters.length === 0) return "At least one character is required";
    const slugs = new Set<string>();
    for (const c of characters) {
      if (!SLUG_PATTERN.test(c.slug))
        return `Invalid slug for "${c.name || c.slug}" — use lowercase letters, digits, underscores`;
      if (slugs.has(c.slug)) return `Duplicate character slug "${c.slug}"`;
      slugs.add(c.slug);
      if (!c.name.trim()) return `Character "${c.slug}" needs a name`;
      if (!c.systemPrompt.trim())
        return `Character "${c.name}" needs a system prompt`;
    }
    return null;
  };

  const handleSave = async () => {
    if (!fields) return;
    const issue = validate();
    if (issue) {
      setSnackbar({ message: issue, type: "error" });
      return;
    }

    const sortOrderTrimmed = fields.sortOrderText.trim();
    const sortOrder = sortOrderTrimmed ? Number(sortOrderTrimmed) : undefined;
    if (sortOrder !== undefined && !Number.isInteger(sortOrder)) {
      setSnackbar({
        message: "Sort order must be a whole number",
        type: "error",
      });
      return;
    }

    const characterInputs: GameCharacterInput[] = characters.map((c, idx) => ({
      slug: c.slug,
      name: c.name,
      imageUrl: c.imageUrl,
      intro: c.intro,
      voiceName: c.voiceName,
      systemPrompt: c.systemPrompt,
      position: idx,
    }));

    setSaving(true);
    try {
      await updateGame(gameId, {
        title: fields.title.trim(),
        level: fields.level,
        setting: fields.setting,
        challenge: fields.challenge,
        accomplishment: fields.accomplishment,
        forKids: fields.forKids,
        isPublished: fields.isPublished,
        ...(sortOrder !== undefined ? { sortOrder } : {}),
        characters: characterInputs,
      });
      queryClient.invalidateQueries({ queryKey: ["adminGame", gameId] });
      queryClient.invalidateQueries({ queryKey: ["adminGames"] });
      setSnackbar({ message: "Game saved", type: "success" });
    } catch (err) {
      setSnackbar({
        message: (err as Error).message || "Failed to save game",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteGame(gameId);
      queryClient.invalidateQueries({ queryKey: ["adminGames"] });
      router.replace("/admin/games");
    } catch (err) {
      setDeleting(false);
      setDeleteDialogVisible(false);
      setSnackbar({
        message: (err as Error).message || "Failed to delete game",
        type: "error",
      });
    }
  };

  if (isLoading || (game && fields === null)) {
    return <LoadingSpinner message="Loading game..." />;
  }

  if (!game || !fields) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Card style={styles.card}>
          <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
            {(error as Error)?.message ?? "Failed to load game."}
          </Text>
          <Button
            title="Retry"
            onPress={() => refetch()}
            style={styles.topSpacing}
          />
        </Card>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Card style={styles.card}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Game
          </Text>
          <View style={styles.infoRow}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Language
            </Text>
            <Text variant="bodyMedium">
              {getVariantName(game.langVariantCode)}
            </Text>
          </View>
          <Input
            label="Title (in the target language)"
            value={fields.title}
            onChangeText={(text) => setField("title", text)}
            maxLength={300}
          />
          <Select
            label="Level"
            options={LEVEL_OPTIONS}
            value={fields.level}
            onValueChange={(value) => setField("level", value as DeckLevel)}
          />
          <Input
            label="Setting"
            value={fields.setting}
            onChangeText={(text) => setField("setting", text)}
            multiline
            numberOfLines={4}
            maxLength={2000}
          />
          <Input
            label="Challenge"
            value={fields.challenge}
            onChangeText={(text) => setField("challenge", text)}
            multiline
            numberOfLines={4}
            maxLength={2000}
          />
          <Input
            label="Accomplishment"
            value={fields.accomplishment}
            onChangeText={(text) => setField("accomplishment", text)}
            multiline
            numberOfLines={3}
            maxLength={2000}
          />
          <View style={styles.switchRow}>
            <Text variant="bodyMedium">For kids</Text>
            <Switch
              value={fields.forKids}
              onValueChange={(value) => setField("forKids", value)}
            />
          </View>
          <View style={styles.switchRow}>
            <Text variant="bodyMedium">Published</Text>
            <Switch
              value={fields.isPublished}
              onValueChange={(value) => setField("isPublished", value)}
            />
          </View>
          <Input
            label="Sort order (optional)"
            value={fields.sortOrderText}
            onChangeText={(text) => setField("sortOrderText", text)}
            keyboardType="numeric"
          />
          <Text
            variant="labelMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Cover image
          </Text>
          <Image
            source={{ uri: game.verticalImageUrl }}
            style={styles.coverPreview}
            resizeMode="cover"
          />
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Images can&apos;t be changed after publishing.
          </Text>
        </Card>

        <View style={styles.charactersHeader}>
          <Text variant="titleMedium">Characters</Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            The first character is the one the learner meets first. Saving
            resets any in-progress learner sessions.
          </Text>
        </View>

        {characters.map((character, index) => (
          <CharacterCard
            key={index}
            index={index}
            count={characters.length}
            character={character}
            imageSlot={
              <View style={styles.characterImageBlock}>
                <Text
                  variant="labelMedium"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  Character image
                </Text>
                <Image
                  source={{ uri: character.imageUrl }}
                  style={styles.characterPreview}
                  resizeMode="cover"
                />
              </View>
            }
            onField={(field, value) => setCharacterField(index, field, value)}
            onCommit={() => {}}
            onMoveUp={() => moveCharacter(index, -1)}
            onMoveDown={() => moveCharacter(index, 1)}
            onDelete={() =>
              setCharacters((prev) => prev.filter((_, i) => i !== index))
            }
          />
        ))}

        <Button
          title="Save changes"
          icon="content-save"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveButton}
        />
        <Button
          title="Delete game"
          variant="danger"
          onPress={() => setDeleteDialogVisible(true)}
          style={styles.topSpacing}
        />
      </ScrollView>

      <Portal>
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title>Delete game?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              This permanently deletes the game, its characters, and all learner
              sessions.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setDeleteDialogVisible(false)}
            />
            <Button
              title="Delete"
              variant="danger"
              loading={deleting}
              onPress={handleDelete}
            />
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <StyledSnackbar snackbar={snackbar} onDismiss={() => setSnackbar(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  coverPreview: {
    width: 135,
    height: 240,
    borderRadius: 8,
    marginVertical: 8,
  },
  characterImageBlock: {
    gap: 8,
    marginBottom: 8,
  },
  characterPreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  charactersHeader: {
    marginBottom: 12,
    gap: 2,
  },
  saveButton: {
    marginTop: 24,
  },
  topSpacing: {
    marginTop: 12,
  },
  dialog: {
    maxWidth: DIALOG_MAX_WIDTH,
    marginHorizontal: "auto",
  },
});
