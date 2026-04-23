import { CollectionMembershipList } from "@/components/platformDeck/CollectionMembershipList";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  getCollection,
  getPlatformDeckDraft,
} from "@/lib/api/platformDecks";
import type { CollectionResponse } from "@/types/collection";
import { useQuery } from "@tanstack/react-query";
import { Redirect, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";

export default function DeckCollectionsScreen() {
  const theme = useTheme();
  const { draftId } = useLocalSearchParams<{ draftId: string }>();

  const { data: draft, isLoading } = useQuery({
    queryKey: ["platformDeck", "draft", draftId],
    queryFn: () => getPlatformDeckDraft(draftId!),
    enabled: !!draftId,
  });

  const { data: primaryCollection } = useQuery({
    queryKey: ["collection", draft?.collectionId],
    queryFn: (): Promise<CollectionResponse> => getCollection(draft!.collectionId),
    enabled: !!draft,
  });

  if (!draftId) return null;
  if (isLoading || !draft) {
    return <LoadingSpinner message="Loading deck..." />;
  }
  if (draft.status !== "processing_completed" || !draft.deckId) {
    return <Redirect href={`/admin/platform-decks/${draftId}/publish`} />;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text variant="titleMedium">{draft.title}</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
});
