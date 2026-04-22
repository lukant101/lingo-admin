import { CollectionMembershipList } from "@/components/platformDeck/CollectionMembershipList";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  StyledSnackbar,
  type SnackbarState,
} from "@/components/ui/StyledSnackbar";
import {
  deletePlatformDeckDraft,
  getPlatformDeckDraft,
  listCollections,
} from "@/lib/api/platformDecks";
import type { CollectionResponse } from "@/types/collection";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";

type PublishProgressProps = {
  draftId: string;
};

const POLL_MS = 2000;
const SLOW_WARN_MS = 10 * 60 * 1000;

export function PublishProgress({ draftId }: PublishProgressProps) {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);
  const [startedAt] = useState(() => Date.now());
  const [slowHint, setSlowHint] = useState(false);

  const { data: draft, isLoading } = useQuery({
    queryKey: ["platformDeck", "draft", draftId],
    queryFn: () => getPlatformDeckDraft(draftId),
    refetchInterval: (q) =>
      q.state.data?.status === "publishing" ? POLL_MS : false,
  });

  useEffect(() => {
    if (draft?.status !== "publishing") return;
    const t = setInterval(() => {
      if (Date.now() - startedAt > SLOW_WARN_MS) setSlowHint(true);
    }, 10_000);
    return () => clearInterval(t);
  }, [draft?.status, startedAt]);

  // Resolve the primary collection so the membership list has something to show.
  const primaryCollectionId = draft?.collectionId;
  const { data: primaryCollection } = useQuery({
    queryKey: ["collection", primaryCollectionId],
    queryFn: async (): Promise<CollectionResponse | null> => {
      if (!draft) return null;
      // No GET /admin/collections/:id endpoint in the contract — look it up via list.
      const res = await listCollections({
        langVariantId: draft.langVariantId,
        level: draft.level,
        forKids: draft.forKids,
        pageSize: 50,
      });
      return res.data.find((c) => c.id === draft.collectionId) ?? null;
    },
    enabled: !!draft && draft.status === "published",
  });

  const handleBackToEdit = () => {
    router.replace(`/admin/platform-decks/${draftId}/edit`);
  };

  const handleDeleteDraft = async () => {
    try {
      await deletePlatformDeckDraft(draftId);
      queryClient.invalidateQueries({ queryKey: ["platformDecks"] });
      router.replace(`/admin/platform-decks`);
    } catch (err) {
      setSnackbar({
        message: (err as Error).message || "Failed to delete draft",
        type: "error",
      });
    }
  };

  if (isLoading || !draft) {
    return <LoadingSpinner message="Loading draft..." />;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.scrollContent}
    >
      <Card>
        <Text variant="titleMedium" style={{ marginBottom: 12 }}>
          {draft.title}
        </Text>

        {draft.status === "draft" && (
          <View style={styles.statusBlock}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              This draft hasn&apos;t been submitted for publishing yet.
            </Text>
            <Button
              title="Back to edit"
              onPress={handleBackToEdit}
              style={styles.actionButton}
            />
          </View>
        )}

        {draft.status === "publishing" && (
          <View style={styles.statusBlock}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text variant="bodyMedium" style={styles.centerText}>
              Translating and transcoding…
            </Text>
            <Text
              variant="bodySmall"
              style={[
                styles.centerText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              This may take a few minutes.
            </Text>
            {slowHint && (
              <Text
                variant="bodySmall"
                style={[
                  styles.centerText,
                  { color: theme.colors.onSurfaceVariant, marginTop: 8 },
                ]}
              >
                Taking longer than expected. Feel free to navigate away — the
                backend will finish on its own.
              </Text>
            )}
          </View>
        )}

        {draft.status === "failed" && (
          <View style={styles.statusBlock}>
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
                {draft.errorCode ? ` (${draft.errorCode})` : ""}.
              </Text>
            </View>
            <Button
              title="Back to edit"
              onPress={handleBackToEdit}
              style={styles.actionButton}
            />
            <Button
              title="Delete draft"
              variant="danger"
              onPress={handleDeleteDraft}
              style={styles.actionButton}
            />
          </View>
        )}

        {draft.status === "published" && draft.deckId && (
          <View style={styles.statusBlock}>
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
                Published! Deck ID:{" "}
                <Text style={{ fontFamily: "monospace" }}>{draft.deckId}</Text>
              </Text>
            </View>
          </View>
        )}
      </Card>

      {draft.status === "published" && draft.deckId && (
        <CollectionMembershipList
          deckId={draft.deckId}
          initialMemberships={
            primaryCollection
              ? [
                  {
                    collection: primaryCollection,
                    published: false,
                    sortOrder: 0,
                  },
                ]
              : []
          }
        />
      )}

      <StyledSnackbar
        snackbar={snackbar}
        onDismiss={() => setSnackbar(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  statusBlock: {
    gap: 12,
    alignItems: "center",
  },
  centerText: {
    textAlign: "center",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    width: "100%",
  },
  actionButton: {
    marginTop: 8,
  },
});
