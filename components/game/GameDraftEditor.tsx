import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Dialog,
  Portal,
  Switch,
  Text,
  useTheme,
} from "react-native-paper";

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
import {
  deleteGameDraft,
  getGameDraft,
  publishGameDraft,
  updateGameDraft,
} from "@/lib/api/gameDrafts";
import { DECK_LEVELS, DIALOG_MAX_WIDTH } from "@/lib/constants";
import { gameCharacterImagePath, gameCoverImagePath } from "@/lib/storage";
import type { DeckLevel } from "@/types/langs";
import type { GameDraftCharacter, UpdateGameDraftInput } from "@/types/game";

const POLL_MS = 2000;
const SLUG_PATTERN = /^[a-z0-9_]+$/;

type GameDraftEditorProps = {
  draftId: string;
};

type DraftFields = {
  title: string;
  level: DeckLevel;
  setting: string;
  challenge: string;
  accomplishment: string;
  forKids: boolean;
  sortOrderText: string;
};

const LEVEL_OPTIONS = DECK_LEVELS.map((level) => ({
  label: level,
  value: level,
}));

function newCharacter(existing: GameDraftCharacter[]): GameDraftCharacter {
  let n = existing.length + 1;
  while (existing.some((c) => c.slug === `character_${n}`)) n += 1;
  return {
    slug: `character_${n}`,
    name: `Character ${n}`,
    imageSourcePath: null,
    intro: "",
    voiceName: "Kore",
    systemPrompt: "",
  };
}

export function GameDraftEditor({ draftId }: GameDraftEditorProps) {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [snackbar, setSnackbar] = useState<SnackbarState>(null);
  const [fields, setFields] = useState<DraftFields | null>(null);
  const [characters, setCharacters] = useState<GameDraftCharacter[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    data: draft,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["gameDraft", draftId],
    queryFn: () => getGameDraft(draftId),
    refetchInterval: (q) =>
      q.state.data?.status === "processing_started" ? POLL_MS : false,
  });

  // Hydrate local form state once the draft first loads.
  useEffect(() => {
    if (!draft || fields !== null) return;
    setFields({
      title: draft.title,
      level: draft.level,
      setting: draft.setting,
      challenge: draft.challenge,
      accomplishment: draft.accomplishment,
      forKids: draft.forKids,
      sortOrderText: draft.sortOrder != null ? String(draft.sortOrder) : "",
    });
    setCharacters(draft.characters);
  }, [draft, fields]);

  // Surface the published game in the games list as soon as processing ends.
  useEffect(() => {
    if (draft?.status === "processing_completed") {
      queryClient.invalidateQueries({ queryKey: ["adminGames"] });
      queryClient.invalidateQueries({ queryKey: ["gameDrafts"] });
    }
  }, [draft?.status, queryClient]);

  const editable = draft?.status === "draft" || draft?.status === "failed";

  const patchDraft = async (input: UpdateGameDraftInput): Promise<boolean> => {
    try {
      await updateGameDraft(draftId, input);
      queryClient.invalidateQueries({ queryKey: ["gameDraft", draftId] });
      return true;
    } catch (err) {
      setSnackbar({
        message: (err as Error).message || "Failed to save changes",
        type: "error",
      });
      return false;
    }
  };

  const setField = <K extends keyof DraftFields>(
    key: K,
    value: DraftFields[K]
  ) => {
    setFields((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const commitTitle = () => {
    if (!fields || !draft) return;
    const trimmed = fields.title.trim();
    if (!trimmed || trimmed === draft.title) return;
    void patchDraft({ title: trimmed });
  };

  const commitText = (key: "setting" | "challenge" | "accomplishment") => {
    if (!fields || !draft) return;
    if (fields[key] === draft[key]) return;
    void patchDraft({ [key]: fields[key] });
  };

  const commitSortOrder = () => {
    if (!fields || !draft) return;
    const trimmed = fields.sortOrderText.trim();
    if (!trimmed) return;
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed)) {
      setSnackbar({
        message: "Sort order must be a whole number",
        type: "error",
      });
      return;
    }
    if (parsed === draft.sortOrder) return;
    void patchDraft({ sortOrder: parsed });
  };

  const commitCharacters = (next: GameDraftCharacter[]) => {
    setCharacters(next);
    void patchDraft({ characters: next });
  };

  const setCharacterField = (
    index: number,
    field: keyof Omit<GameDraftCharacter, "imageSourcePath">,
    value: string
  ) => {
    setCharacters((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const moveCharacter = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= characters.length) return;
    const next = [...characters];
    [next[index], next[target]] = [next[target], next[index]];
    commitCharacters(next);
  };

  const validateForPublish = (): string | null => {
    if (!fields || !draft) return "Draft not loaded";
    if (!fields.title.trim()) return "Title is required";
    if (!fields.setting.trim()) return "Setting is required";
    if (!fields.challenge.trim()) return "Challenge is required";
    if (!draft.verticalImageSourcePath) return "Cover image is required";
    if (characters.length === 0) return "Add at least one character";
    const slugs = new Set<string>();
    for (const c of characters) {
      if (!SLUG_PATTERN.test(c.slug))
        return `Invalid slug for "${c.name || c.slug}" — use lowercase letters, digits, underscores`;
      if (slugs.has(c.slug)) return `Duplicate character slug "${c.slug}"`;
      slugs.add(c.slug);
      if (!c.name.trim()) return `Character "${c.slug}" needs a name`;
      if (!c.systemPrompt.trim())
        return `Character "${c.name}" needs a system prompt`;
      if (!c.imageSourcePath) return `Character "${c.name}" needs an image`;
    }
    return null;
  };

  const handlePublish = async () => {
    if (!fields) return;
    setPublishing(true);
    try {
      // Commit any in-progress edits before validating and publishing.
      const saved = await patchDraft({
        title: fields.title.trim() || undefined,
        level: fields.level,
        setting: fields.setting,
        challenge: fields.challenge,
        accomplishment: fields.accomplishment,
        forKids: fields.forKids,
        characters,
      });
      if (!saved) return;

      const issue = validateForPublish();
      if (issue) {
        setSnackbar({ message: issue, type: "error" });
        return;
      }

      await publishGameDraft(draftId);
      queryClient.invalidateQueries({ queryKey: ["gameDraft", draftId] });
    } catch (err) {
      setSnackbar({
        message: (err as Error).message || "Failed to publish",
        type: "error",
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteGameDraft(draftId);
      queryClient.invalidateQueries({ queryKey: ["gameDrafts"] });
      router.replace("/games");
    } catch (err) {
      setDeleting(false);
      setDeleteDialogVisible(false);
      setSnackbar({
        message: (err as Error).message || "Failed to delete draft",
        type: "error",
      });
    }
  };

  if (isLoading || (draft && fields === null)) {
    return <LoadingSpinner message="Loading draft..." />;
  }

  if (!draft || !fields) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Card style={styles.card}>
          <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
            {(error as Error)?.message ?? "Failed to load draft."}
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
        {draft.status === "processing_started" && (
          <Card style={styles.card}>
            <View style={styles.statusBlock}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text variant="bodyMedium">Publishing game…</Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Copying images and creating the game. This usually takes a few
                seconds.
              </Text>
            </View>
          </Card>
        )}

        {draft.status === "processing_completed" && (
          <Card style={styles.card}>
            <View
              style={[
                styles.banner,
                { backgroundColor: theme.colors.secondaryContainer },
              ]}
            >
              <MaterialCommunityIcons
                name="check-circle"
                size={20}
                color={theme.colors.onSecondaryContainer}
              />
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSecondaryContainer, flex: 1 }}
              >
                Game published!
              </Text>
            </View>
            {draft.gameId && (
              <Button
                title="Open published game"
                onPress={() =>
                  router.replace(`/admin/games/${draft.gameId}/edit`)
                }
                style={styles.topSpacing}
              />
            )}
            <Button
              title="Back to games"
              variant="outline"
              onPress={() => router.replace("/games")}
              style={styles.topSpacing}
            />
          </Card>
        )}

        {draft.status === "failed" && (
          <Card style={styles.card}>
            <View
              style={[
                styles.banner,
                { backgroundColor: theme.colors.errorContainer },
              ]}
            >
              <MaterialCommunityIcons
                name="alert-circle"
                size={20}
                color={theme.colors.onErrorContainer}
              />
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onErrorContainer, flex: 1 }}
              >
                Publishing failed
                {draft.errorCode ? ` (${draft.errorCode})` : ""}. Fix the issue
                below and publish again.
              </Text>
            </View>
          </Card>
        )}

        {draft.status !== "processing_completed" && (
          <>
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
                  {draft.langVariantCode.toUpperCase()}
                </Text>
              </View>
              <Input
                label="Title (in the target language)"
                value={fields.title}
                onChangeText={(text) => setField("title", text)}
                onBlur={commitTitle}
                maxLength={300}
                editable={editable}
              />
              <Select
                label="Level"
                options={LEVEL_OPTIONS}
                value={fields.level}
                onValueChange={(value) => {
                  setField("level", value as DeckLevel);
                  void patchDraft({ level: value as DeckLevel });
                }}
              />
              <Input
                label="Setting (where the learner is, what's going on)"
                value={fields.setting}
                onChangeText={(text) => setField("setting", text)}
                onBlur={() => commitText("setting")}
                multiline
                numberOfLines={4}
                maxLength={2000}
                editable={editable}
              />
              <Input
                label="Challenge (what the learner must accomplish)"
                value={fields.challenge}
                onChangeText={(text) => setField("challenge", text)}
                onBlur={() => commitText("challenge")}
                multiline
                numberOfLines={4}
                maxLength={2000}
                editable={editable}
              />
              <Input
                label="Accomplishment (past-tense summary for the celebration)"
                value={fields.accomplishment}
                onChangeText={(text) => setField("accomplishment", text)}
                onBlur={() => commitText("accomplishment")}
                multiline
                numberOfLines={3}
                maxLength={2000}
                editable={editable}
              />
              <View style={styles.switchRow}>
                <Text variant="bodyMedium">For kids</Text>
                <Switch
                  value={fields.forKids}
                  disabled={!editable}
                  onValueChange={(value) => {
                    setField("forKids", value);
                    void patchDraft({ forKids: value });
                  }}
                />
              </View>
              <Input
                label="Sort order (optional)"
                value={fields.sortOrderText}
                onChangeText={(text) => setField("sortOrderText", text)}
                onBlur={commitSortOrder}
                keyboardType="numeric"
                editable={editable}
              />
              <GameImageUploadField
                label="Cover image (vertical)"
                aspectRatio={[9, 16]}
                resizeVariant="vertical"
                existingPath={draft.verticalImageSourcePath}
                buildGcsPath={(filename) =>
                  gameCoverImagePath(draft.uploadBasePath, filename)
                }
                onUploaded={(gcsPath) =>
                  patchDraft({ verticalImageSourcePath: gcsPath })
                }
                onRemove={() => patchDraft({ verticalImageSourcePath: "" })}
                disabled={!editable}
              />
            </Card>

            <View style={styles.charactersHeader}>
              <Text variant="titleMedium">Characters</Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                The first character is the one the learner meets first.
              </Text>
            </View>

            {characters.map((character, index) => (
              <CharacterCard
                key={index}
                index={index}
                count={characters.length}
                character={character}
                imageSlot={
                  <GameImageUploadField
                    label="Character image"
                    aspectRatio={[1, 1]}
                    existingPath={character.imageSourcePath}
                    buildGcsPath={(filename) =>
                      gameCharacterImagePath(
                        draft.uploadBasePath,
                        SLUG_PATTERN.test(character.slug)
                          ? character.slug
                          : `c${index}`,
                        filename
                      )
                    }
                    onUploaded={(gcsPath) =>
                      commitCharacters(
                        characters.map((c, i) =>
                          i === index ? { ...c, imageSourcePath: gcsPath } : c
                        )
                      )
                    }
                    onRemove={() =>
                      commitCharacters(
                        characters.map((c, i) =>
                          i === index ? { ...c, imageSourcePath: null } : c
                        )
                      )
                    }
                    disabled={!editable}
                  />
                }
                onField={(field, value) =>
                  setCharacterField(index, field, value)
                }
                onCommit={() => void patchDraft({ characters })}
                onMoveUp={() => moveCharacter(index, -1)}
                onMoveDown={() => moveCharacter(index, 1)}
                onDelete={() =>
                  commitCharacters(characters.filter((_, i) => i !== index))
                }
                disabled={!editable}
              />
            ))}

            <Button
              title="Add character"
              variant="outline"
              icon="plus"
              disabled={!editable}
              onPress={() =>
                commitCharacters([...characters, newCharacter(characters)])
              }
            />

            <Button
              title="Publish game"
              icon="publish"
              onPress={handlePublish}
              loading={publishing}
              disabled={!editable || publishing}
              style={styles.publishButton}
            />
            <Button
              title="Delete draft"
              variant="danger"
              disabled={draft.status === "processing_started"}
              onPress={() => setDeleteDialogVisible(true)}
              style={styles.topSpacing}
            />
          </>
        )}
      </ScrollView>

      <Portal>
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title>Delete draft?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              This permanently deletes the draft. Uploaded images stay in
              storage but won&apos;t be used.
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
  statusBlock: {
    gap: 12,
    alignItems: "center",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    width: "100%",
  },
  publishButton: {
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
