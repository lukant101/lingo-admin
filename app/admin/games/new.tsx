import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

import LanguageSearch from "@/components/LanguageSearch";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  StyledSnackbar,
  type SnackbarState,
} from "@/components/ui/StyledSnackbar";
import { createGameDraft } from "@/lib/api/gameDrafts";
import { DECK_LEVELS } from "@/lib/constants";
import type { DeckLevel } from "@/types/langs";

const LEVEL_OPTIONS = DECK_LEVELS.map((level) => ({
  label: level,
  value: level,
}));

export default function NewGameScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [lang, setLang] = useState<{ code: string; name: string } | undefined>(
    undefined
  );
  const [level, setLevel] = useState<DeckLevel>(DECK_LEVELS[0]);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  const createMutation = useMutation({
    mutationFn: createGameDraft,
    onSuccess: (draft) => {
      queryClient.invalidateQueries({ queryKey: ["gameDrafts"] });
      router.replace(`/admin/games/draft/${draft.id}`);
    },
    onError: (err) => {
      setSnackbar({
        message: (err as Error).message || "Failed to create game draft",
        type: "error",
      });
    },
  });

  const canCreate = !!title.trim() && !!lang && !createMutation.isPending;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Card style={styles.card}>
          <View style={styles.headerRow}>
            <MaterialCommunityIcons
              name="gamepad-variant"
              size={24}
              color={theme.colors.primary}
            />
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface, marginLeft: 10 }}
            >
              New game
            </Text>
          </View>

          <Input
            label="Title (in the target language)"
            value={title}
            onChangeText={setTitle}
            placeholder="Enter game title"
            maxLength={300}
          />

          <LanguageSearch onSelect={setLang} value={lang} />

          <Select
            label="Level"
            options={LEVEL_OPTIONS}
            value={level}
            onValueChange={(value) => setLevel(value as DeckLevel)}
          />

          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            You&apos;ll add the scenario, images, and characters in the next
            step.
          </Text>
        </Card>

        <Button
          title="Create draft"
          onPress={() =>
            lang &&
            createMutation.mutate({
              title,
              langVariantCode: lang.code,
              level,
            })
          }
          loading={createMutation.isPending}
          disabled={!canCreate}
          style={styles.createButton}
        />
        <Button
          title="Cancel"
          variant="outline"
          onPress={() => router.back()}
          style={styles.cancelButton}
        />
      </ScrollView>

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
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  createButton: {
    marginTop: 24,
    marginBottom: 8,
  },
  cancelButton: {
    marginTop: 8,
  },
});
