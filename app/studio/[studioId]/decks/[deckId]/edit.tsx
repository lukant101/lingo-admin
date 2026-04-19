import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  StyledSnackbar,
  type SnackbarState,
} from "@/components/ui/StyledSnackbar";
import { listDecks, updateDeck } from "@/lib/api/submissions";
import type { DeckSummary } from "@/types/deck";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { IconButton, Text, useTheme } from "react-native-paper";

export default function EditDeckScreen() {
  const { studioId, deckId } = useLocalSearchParams<{
    studioId: string;
    deckId: string;
  }>();
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deck, setDeck] = useState<DeckSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  // Form state
  const [isFeatured, setIsFeatured] = useState(false);

  const fetchDeck = useCallback(async () => {
    if (!studioId || !deckId) return;

    try {
      setError(null);
      const result = await listDecks(studioId);
      const found = result.data.find((d) => d.id === deckId);
      if (!found) {
        setError("Deck not found");
        return;
      }
      setDeck(found);
      setIsFeatured(found.isFeatured);
    } catch (err) {
      console.error("Error fetching deck:", err);
      setError("Failed to load deck");
    } finally {
      setLoading(false);
    }
  }, [studioId, deckId]);

  useEffect(() => {
    fetchDeck();
  }, [fetchDeck]);

  const handleSave = async () => {
    if (!studioId || !deckId || !deck) return;

    setSaving(true);
    try {
      await updateDeck(studioId, deckId, { isFeatured });
      setSnackbar({ message: "Deck updated", type: "success" });
      await queryClient.invalidateQueries({ queryKey: ["decks", studioId] });
      setDeck({ ...deck, isFeatured });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save changes";
      setSnackbar({ message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = deck && isFeatured !== deck.isFeatured;

  if (loading) {
    return <LoadingSpinner message="Loading deck..." />;
  }

  if (error || !deck) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <FontAwesome
          name="exclamation-circle"
          size={48}
          color={theme.colors.error}
        />
        <Text
          variant="titleMedium"
          style={[styles.errorTitle, { color: theme.colors.onBackground }]}
        >
          {error ?? "Deck not found"}
        </Text>
        <Button
          title="Back"
          variant="outline"
          onPress={() => router.back()}
          style={{ marginTop: 16 }}
        />
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
          <View style={styles.headerRow}>
            <MaterialCommunityIcons
              name="cards-outline"
              size={24}
              color={theme.colors.primary}
            />
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface, marginLeft: 10 }}
            >
              Edit Deck
            </Text>
          </View>

          <Text
            variant="bodySmall"
            style={{
              color: theme.colors.onSurfaceVariant,
              marginBottom: 16,
              fontStyle: "italic",
            }}
          >
            For now, you can only add or remove a deck from your featured list.
            More editing options are coming soon.
          </Text>

          <View style={styles.infoRow}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Title
            </Text>
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurface,
                flex: 1,
                textAlign: "right",
                marginRight: 8,
              }}
              numberOfLines={1}
            >
              {deck.title}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Level
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurface, marginRight: 8 }}
            >
              {deck.level}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Cards
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurface, marginRight: 8 }}
            >
              {deck.cardCount}
            </Text>
          </View>

          <View style={styles.featuredRow}>
            <View style={styles.featuredLabelContainer}>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurface }}
              >
                Featured
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
              >
                Featured decks are visible in your store pages.
              </Text>
            </View>
            <IconButton
              icon={isFeatured ? "heart" : "heart-outline"}
              iconColor={
                isFeatured ? theme.colors.error : theme.colors.onSurfaceVariant
              }
              size={28}
              style={{ margin: 0 }}
              onPress={() => setIsFeatured((v) => !v)}
            />
          </View>
        </Card>

        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={saving}
          disabled={!hasChanges}
          style={styles.saveButton}
        />

        <Button
          title="Back"
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
  centered: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
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
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    gap: 16,
  },
  featuredRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginTop: 8,
  },
  featuredLabelContainer: {
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    marginTop: 8,
  },
  cancelButton: {
    marginTop: 24,
  },
  errorTitle: {
    marginTop: 16,
  },
});
