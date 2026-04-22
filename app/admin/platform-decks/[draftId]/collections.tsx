import { CollectionMembershipList } from "@/components/platformDeck/CollectionMembershipList";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  getPlatformDeckDraft,
  listCollections,
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
    queryFn: async (): Promise<CollectionResponse | null> => {
      if (!draft) return null;
      const res = await listCollections({
        langVariantId: draft.langVariantId,
        level: draft.level,
        forKids: draft.forKids,
        pageSize: 50,
      });
      return res.data.find((c) => c.id === draft.collectionId) ?? null;
    },
    enabled: !!draft,
  });

  if (!draftId) return null;
  if (isLoading || !draft) {
    return <LoadingSpinner message="Loading deck..." />;
  }
  if (draft.status !== "published" || !draft.deckId) {
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
