import { CollectionMembershipList } from "@/components/platformDeck/CollectionMembershipList";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getPlatformDeckDraft } from "@/lib/api/platformDecks";
import { useQuery } from "@tanstack/react-query";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";

export default function DeckCollectionsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { draftId } = useLocalSearchParams<{ draftId: string }>();

  const { data: draft, isLoading } = useQuery({
    queryKey: ["platformDeck", "draft", draftId],
    queryFn: () => getPlatformDeckDraft(draftId!),
    enabled: !!draftId,
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
      <Button
        title="Edit deck"
        icon="pencil"
        variant="outline"
        onPress={() => router.push(`/admin/decks/${draft.deckId}` as never)}
      />
      <CollectionMembershipList deckId={draft.deckId} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
});
