import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getCollection } from "@/lib/api/platformDecks";
import type { CollectionDeckItem } from "@/types/collection";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

export default function CollectionDetailScreen() {
  const theme = useTheme();
  const { collectionId } = useLocalSearchParams<{ collectionId: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["collection", collectionId],
    queryFn: () => getCollection(collectionId!),
    enabled: !!collectionId,
  });

  const sortedDecks = useMemo(() => {
    if (!data?.decks) return [];
    return [...data.decks].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [data?.decks]);

  if (!collectionId) return null;

  const tags: string[] = data ? [data.level] : [];
  if (data?.forKids) tags.push("kids");
  if (data?.mature) tags.push("mature");

  return (
    <>
      <Stack.Screen options={{ title: data?.title || "Collection" }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.content}
      >
        {isLoading && <LoadingSpinner message="Loading collection..." />}

        {error && !isLoading && (
          <Card>
            <Text variant="bodySmall" style={{ color: theme.colors.error }}>
              Failed to load collection: {(error as Error).message}
            </Text>
          </Card>
        )}

        {data && (
          <>
            <View style={styles.header}>
              <Text variant="headlineSmall">{data.title}</Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {tags.join(" · ")}
              </Text>
            </View>

            <Text
              variant="titleSmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Decks
            </Text>

            {sortedDecks.length === 0 ? (
              <Card>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  No decks in this collection yet.
                </Text>
              </Card>
            ) : (
              <View style={styles.list}>
                {sortedDecks.map((deck) => (
                  <DeckRow key={deck.deckId} deck={deck} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

function DeckRow({ deck }: { deck: CollectionDeckItem }) {
  const theme = useTheme();
  return (
    <Card>
      <View style={styles.deckRow}>
        <View style={{ flex: 1 }}>
          <Text variant="titleMedium" numberOfLines={1}>
            {deck.title || "Untitled"}
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            sort order: {deck.sortOrder}
          </Text>
        </View>
        <View style={styles.statusCell}>
          <MaterialCommunityIcons
            name={deck.published ? "eye" : "eye-off"}
            size={18}
            color={
              deck.published
                ? theme.colors.primary
                : theme.colors.onSurfaceVariant
            }
          />
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {deck.published ? "Published" : "Hidden"}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    gap: 4,
  },
  list: {
    gap: 8,
  },
  deckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusCell: {
    alignItems: "center",
    gap: 2,
  },
});
