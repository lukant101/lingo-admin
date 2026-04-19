import { StudioCard } from "@/components/StudioCard";
import { StatusBadge } from "@/components/submission/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getStudioSettings } from "@/lib/api/studios";
import { listDecks, listSubmissions } from "@/lib/api/submissions";
import type { DeckSummary } from "@/types/deck";
import type { SubmissionStatus } from "@/types/submission";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FlatList, Image, StyleSheet, View } from "react-native";
import { Divider, IconButton, Text, useTheme } from "react-native-paper";

const ACTIONABLE_STATUSES: SubmissionStatus[] = ["draft"];
const TERMINAL_STATUSES: SubmissionStatus[] = [
  "approved",
  "processing_completed",
  "rejected",
  "cancelled",
  "failed",
];
const POLLING_STATUSES: SubmissionStatus[] = [
  "submitted",
  "in_review",
  "requires_admin_review",
  "processing_started",
];

export default function StudioDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { studioId } = useLocalSearchParams<{ studioId: string }>();

  const { data: submissionsData, isLoading: submissionsLoading } = useQuery({
    queryKey: ["submissions", studioId, "latest"],
    queryFn: () => listSubmissions(studioId!, { pageSize: 1 }),
    enabled: !!studioId,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.[0]?.status;
      if (status && POLLING_STATUSES.includes(status)) {
        return 5000;
      }
      return false;
    },
  });

  const lastSubmissionStatus = submissionsData?.data?.[0]?.status;

  const { data: decksData, isLoading: decksLoading } = useQuery({
    queryKey: ["decks", studioId, lastSubmissionStatus],
    queryFn: () => listDecks(studioId!),
    enabled: !!studioId,
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["studioSettings", studioId],
    queryFn: () => getStudioSettings(studioId!),
    enabled: !!studioId,
  });

  if (submissionsLoading || decksLoading || settingsLoading) {
    return <LoadingSpinner message="Loading studio..." />;
  }

  const lastSubmission = submissionsData?.data?.[0] ?? null;
  const isActionable = lastSubmission
    ? ACTIONABLE_STATUSES.includes(lastSubmission.status)
    : false;
  const canCreateNew =
    !lastSubmission || TERMINAL_STATUSES.includes(lastSubmission.status);

  const decks = decksData?.data ?? [];

  const handleContinue = () => {
    if (!lastSubmission) return;
    router.push(`/submission/${studioId}/${lastSubmission.id}`);
  };

  const handleNewDeck = () => {
    router.push(`/studio/${studioId}/new-deck`);
  };

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
            <Card style={styles.submissionCard}>
              <Text
                variant="titleMedium"
                style={{ marginBottom: 12, color: theme.colors.onSurface }}
              >
                Last Submission
              </Text>

              {lastSubmission ? (
                <>
                  <View style={styles.submissionRow}>
                    <Text
                      variant="bodyMedium"
                      numberOfLines={1}
                      style={{ flex: 1, color: theme.colors.onSurface }}
                    >
                      {lastSubmission.title || "Untitled"}
                    </Text>
                    <StatusBadge status={lastSubmission.status} />
                  </View>
                  <Text
                    variant="bodySmall"
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      marginTop: 4,
                    }}
                  >
                    {new Date(lastSubmission.updatedAt).toLocaleDateString()}
                  </Text>
                </>
              ) : (
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  No submissions yet.
                </Text>
              )}

              {isActionable && (
                <Button
                  title="Continue"
                  onPress={handleContinue}
                  style={styles.actionButton}
                />
              )}
              {canCreateNew && (
                <Button
                  title="New Deck"
                  icon="plus"
                  onPress={handleNewDeck}
                  style={styles.actionButton}
                />
              )}
              {!isActionable && !canCreateNew && (
                <Text
                  variant="bodySmall"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    marginTop: 16,
                  }}
                >
                  A new deck cannot be created while a submission is pending.
                </Text>
              )}
            </Card>

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
  submissionCard: {
    margin: 16,
  },
  submissionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  actionButton: {
    marginTop: 16,
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
