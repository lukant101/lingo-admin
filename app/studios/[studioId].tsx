import { StudioCard } from "@/components/StudioCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getStudioSettings } from "@/lib/api/studios";
import { listDecks } from "@/lib/api/submissions";
import type { DeckSummary } from "@/types/deck";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FlatList, Image, StyleSheet, View } from "react-native";
import { Divider, IconButton, Text, useTheme } from "react-native-paper";

export default function StudioDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { studioId } = useLocalSearchParams<{ studioId: string }>();

  const { data: decksData, isLoading: decksLoading } = useQuery({
    queryKey: ["decks", studioId],
    queryFn: () => listDecks(studioId!),
    enabled: !!studioId,
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["studioSettings", studioId],
    queryFn: () => getStudioSettings(studioId!),
    enabled: !!studioId,
  });

  if (decksLoading || settingsLoading) {
    return <LoadingSpinner message="Loading studio..." />;
  }

  const decks = decksData?.data ?? [];

  const renderDeck = ({ item }: { item: DeckSummary }) => (
    <View style={[styles.deckItem, { backgroundColor: theme.colors.surface }]}>
      {item.horizontalImageUrl ? (
        <Image
          source={{ uri: item.horizontalImageUrl }}
          style={styles.deckImage}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.deckImage,
            styles.deckImagePlaceholder,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        />
      )}
      <View style={styles.deckInfo}>
        <Text variant="titleSmall" numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.deckMetaRow}>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Level {item.level} &middot; {item.cardCount} cards
          </Text>
          {item.isFeatured && (
            <IconButton
              icon="heart"
              size={14}
              iconColor={theme.colors.error}
              style={styles.featuredIcon}
            />
          )}
        </View>
      </View>
      <IconButton
        icon="pencil"
        size={20}
        onPress={() => router.push(`/studio/${studioId}/decks/${item.id}/edit`)}
      />
    </View>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <FlatList
        data={decks}
        keyExtractor={(item) => item.id}
        renderItem={renderDeck}
        ItemSeparatorComponent={() => <Divider />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {settings && (
              <View style={styles.studioCardWrapper}>
                <StudioCard
                  name={settings.name}
                  level={settings.level}
                  logoUrl={settings.logoUrl}
                  langVariantCode={settings.langVariantCode}
                  isForSale={settings.isForSale}
                  action="edit"
                  onPress={() => router.push(`/studio/${studioId}/edit`)}
                />
              </View>
            )}
            <Text
              variant="titleMedium"
              style={{
                paddingHorizontal: 16,
                paddingTop: 24,
                paddingBottom: 12,
                color: theme.colors.onSurface,
              }}
            >
              Published Decks
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: "center",
              }}
            >
              No published decks yet.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flexGrow: 1,
  },
  studioCardWrapper: {
    marginTop: 8,
  },
  deckItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  deckImage: {
    width: 100,
    height: 56,
    borderRadius: 8,
  },
  deckImagePlaceholder: {
    width: 100,
    height: 56,
    borderRadius: 8,
  },
  deckInfo: {
    flex: 1,
    gap: 4,
  },
  deckMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  featuredIcon: {
    margin: 0,
    marginLeft: 4,
  },
  empty: {
    padding: 32,
    alignItems: "center",
  },
});
