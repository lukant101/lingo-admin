import { CollectionPicker } from "@/components/platformDeck/CollectionPicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { StepIndicator } from "@/components/submission/StepIndicator";
import {
  StyledSnackbar,
  type SnackbarState,
} from "@/components/ui/StyledSnackbar";
import { createPlatformDeckDraft } from "@/lib/api/platformDecks";
import type { CollectionResponse } from "@/types/collection";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

const STEP_LABELS = ["Collection", "Video", "Images", "Cards", "Publish"];

export default function NewPlatformDeckScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [collection, setCollection] = useState<CollectionResponse | null>(null);
  const [title, setTitle] = useState("");
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  const createMutation = useMutation({
    mutationFn: createPlatformDeckDraft,
    onSuccess: (draft) => {
      router.replace(`/admin/platform-decks/${draft.id}/edit`);
    },
    onError: (err: Error) => {
      setSnackbar({
        message: err.message || "Failed to create draft",
        type: "error",
      });
    },
  });

  const canCreate =
    !!collection && title.trim().length > 0 && !createMutation.isPending;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StepIndicator
        currentStep={1}
        completedSteps={0}
        labels={STEP_LABELS}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text variant="titleMedium" style={styles.heading}>
            New platform deck
          </Text>
          <Text
            variant="bodySmall"
            style={{
              color: theme.colors.onSurfaceVariant,
              marginBottom: 12,
            }}
          >
            Pick the collection this deck will live in — you cannot change it
            later. Level, language, and kids flag inherit from the collection.
          </Text>
          <CollectionPicker value={collection} onChange={setCollection} />
        </Card>

        <Card>
          <Input
            label="Deck title"
            value={title}
            onChangeText={setTitle}
            maxLength={200}
          />
          <Text
            variant="labelSmall"
            style={{
              color: theme.colors.onSurfaceVariant,
              textAlign: "right",
            }}
          >
            {title.length}/200
          </Text>
        </Card>

        <Button
          title="Create draft"
          onPress={() => {
            if (!collection) return;
            createMutation.mutate({
              title: title.trim(),
              collectionId: collection.id,
            });
          }}
          loading={createMutation.isPending}
          disabled={!canCreate}
        />
      </ScrollView>
      <StyledSnackbar
        snackbar={snackbar}
        onDismiss={() => setSnackbar(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
  heading: {
    marginBottom: 4,
  },
});
