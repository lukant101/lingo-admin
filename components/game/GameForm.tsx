import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Dialog, Portal, Switch, Text, useTheme } from "react-native-paper";

import { CharacterCard } from "@/components/game/CharacterCard";
import { GameImageUploadField } from "@/components/game/GameImageUploadField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import {
  StyledSnackbar,
  type SnackbarState,
} from "@/components/ui/StyledSnackbar";
import { useAuth } from "@/contexts/AuthContext";
import { deleteGame, getGame, updateGame } from "@/lib/api/games";
import { DECK_LEVELS, DIALOG_MAX_WIDTH } from "@/lib/constants";
import { getVariantName } from "@/lib/languages";
import {
  gameCharacterImagePath,
  gameCoverImagePath,
  storagePath,
} from "@/lib/storage";
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
  /** Mates-bucket path of a newly uploaded replacement image, if any. */
  imageSourcePath: string | null;
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
  const { user } = useAuth();

  const [snackbar, setSnackbar] = useState<SnackbarState>(null);
  const [fields, setFields] = useState<GameFields | null>(null);
  const [characters, setCharacters] = useState<EditableCharacter[]>([]);
  const [pendingCoverSourcePath, setPendingCoverSourcePath] = useState<
    string | null
  >(null);
  const [regenerateTranslations, setRegenerateTranslations] = useState(true);
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
        imageSourcePath: null,
        intro: c.intro,
        voiceName: c.voiceName,
        systemPrompt: c.systemPrompt,
      }))
    );
  }, [game, fields]);

  // Replacement images are uploaded like draft images: to the mates bucket
  // under the gameDrafts prefix (with the game id in the draft-id slot), then
  // the API copies them to the CDN on save.
  const uploadBasePath = user
    ? storagePath("gameDrafts", user.uid, gameId)
    : null;

  const setField = <K extends keyof GameFields>(
    key: K,
    value: GameFields[K]
  ) => {
    setFields((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const setCharacterField = (
    index: number,
    field: keyof Omit<EditableCharacter, "imageUrl" | "imageSourcePath">,
    value: string
  ) => {
    setCharacters((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const setCharacterImageSourcePath = (index: number, path: string | null) => {
    setCharacters((prev) =>
      prev.map((c, i) => (i === index ? { ...c, imageSourcePath: path } : c))
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
    if (!fields.accomplishment.trim()) return "Accomplishment is required";
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
      ...(c.imageSourcePath ? { imageSourcePath: c.imageSourcePath } : {}),
      intro: c.intro,
      voiceName: c.voiceName,
      systemPrompt: c.systemPrompt,
      position: idx,
    }));

    setSaving(true);
    try {
      const updated = await updateGame(gameId, {
        title: fields.title.trim(),
        level: fields.level,
        setting: fields.setting,
        challenge: fields.challenge,
        accomplishment: fields.accomplishment,
        forKids: fields.forKids,
        isPublished: fields.isPublished,
        ...(sortOrder !== undefined ? { sortOrder } : {}),
        ...(pendingCoverSourcePath
          ? { verticalImageSourcePath: pendingCoverSourcePath }
          : {}),
        characters: characterInputs,
        regenerateTranslations,
      });
      // Sync image URLs from the response: replaced images now live at new
      // CDN URLs, and resending the old URL on a later save would revert them.
      setPendingCoverSourcePath(null);
      setRegenerateTranslations(true);
      setCharacters((prev) =>
        prev.map((c) => ({
          ...c,
          imageUrl:
            updated.characters.find((uc) => uc.slug === c.slug)?.imageUrl ??
            c.imageUrl,
          imageSourcePath: null,
        }))
      );
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
      router.replace("/games");
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
    return (
      <>
        <Stack.Screen options={{ title: game?.title || "Edit game" }} />
        <LoadingSpinner message="Loading game..." />
      </>
    );
  }

  if (!game || !fields) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Stack.Screen options={{ title: "Edit game" }} />
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

  // Whether any text that feeds translations (setting, challenge, character
  // intros) differs from the saved game — decides if the regenerate switch
  // is shown.
  const savedIntrosBySlug = new Map(
    game.characters.map((c) => [c.slug, c.intro])
  );
  const translationsEdited =
    fields.setting !== game.setting ||
    fields.challenge !== game.challenge ||
    characters.some((c) =>
      savedIntrosBySlug.has(c.slug)
        ? savedIntrosBySlug.get(c.slug) !== c.intro
        : c.intro.trim().length > 0
    );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Stack.Screen options={{ title: game.title || "Edit game" }} />
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
          {uploadBasePath && (
            <GameImageUploadField
              label="Cover image (vertical)"
              aspectRatio={[9, 16]}
              resizeVariant="vertical"
              existingPath={pendingCoverSourcePath}
              existingUrl={game.verticalImageUrl}
              buildGcsPath={(filename) =>
                gameCoverImagePath(uploadBasePath, filename)
              }
              onUploaded={(gcsPath) => setPendingCoverSourcePath(gcsPath)}
              onRemove={() => setPendingCoverSourcePath(null)}
            />
          )}
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
              uploadBasePath ? (
                <GameImageUploadField
                  label="Character image"
                  aspectRatio={[1, 1]}
                  resizeVariant="square"
                  existingPath={character.imageSourcePath}
                  existingUrl={character.imageUrl}
                  buildGcsPath={(filename) =>
                    gameCharacterImagePath(
                      uploadBasePath,
                      SLUG_PATTERN.test(character.slug)
                        ? character.slug
                        : `c${index}`,
                      filename
                    )
                  }
                  onUploaded={(gcsPath) =>
                    setCharacterImageSourcePath(index, gcsPath)
                  }
                  onRemove={() => setCharacterImageSourcePath(index, null)}
                />
              ) : null
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

        {translationsEdited && (
          <Card style={styles.regenerateCard}>
            <View style={styles.switchRow}>
              <View style={styles.regenerateLabel}>
                <Text variant="bodyMedium">Regenerate translations</Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  The setting, challenge, or a character intro changed. Turn off
                  to keep the existing translations, e.g. for a typo or
                  punctuation fix.
                </Text>
              </View>
              <Switch
                value={regenerateTranslations}
                onValueChange={setRegenerateTranslations}
              />
            </View>
          </Card>
        )}

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
  charactersHeader: {
    marginBottom: 12,
    gap: 2,
  },
  regenerateCard: {
    marginTop: 16,
  },
  regenerateLabel: {
    flex: 1,
    marginRight: 16,
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
