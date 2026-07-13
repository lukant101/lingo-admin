import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Chip, Text, useTheme } from "react-native-paper";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import { listGameDrafts } from "@/lib/api/gameDrafts";
import { listGames } from "@/lib/api/games";
import { DECK_LEVELS } from "@/lib/constants";
import { getVariantName } from "@/lib/languages";
import type { DeckLevel } from "@/types/langs";
import type {
  AdminGame,
  GameDraftResponse,
  GameDraftStatus,
} from "@/types/game";

const PAGE_SIZE = 20;
const DRAFTS_POLL_MS = 3000;

const DRAFT_STATUS_META: Partial<
  Record<GameDraftStatus, { label: string; icon: string }>
> = {
  draft: { label: "Draft", icon: "pencil-outline" },
  processing_started: { label: "Publishing…", icon: "progress-clock" },
  failed: { label: "Failed", icon: "alert-circle-outline" },
};

const LEVEL_FILTER_OPTIONS = [
  { label: "All levels", value: "all" },
  ...DECK_LEVELS.map((level) => ({ label: level, value: level })),
];

export default function GamesLandingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const draftsQuery = useQuery({
    queryKey: ["gameDrafts", "all"],
    queryFn: () => listGameDrafts({ pageSize: 50 }),
    refetchInterval: (q) =>
      q.state.data?.data.some((d) => d.status === "processing_started")
        ? DRAFTS_POLL_MS
        : false,
  });

  const gamesQuery = useQuery({
    queryKey: ["adminGames", page, levelFilter],
    queryFn: () =>
      listGames({
        page,
        pageSize: PAGE_SIZE,
        level: levelFilter === "all" ? undefined : (levelFilter as DeckLevel),
      }),
  });

  if (draftsQuery.isLoading && gamesQuery.isLoading) {
    return <LoadingSpinner message="Loading games..." />;
  }

  // Completed drafts have become games; only show in-flight ones here.
  const drafts = (draftsQuery.data?.data ?? []).filter(
    (d) => d.status !== "processing_completed"
  );
  const games = gamesQuery.data?.data ?? [];
  const total = gamesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text variant="headlineSmall">Games</Text>
        <Button
          title="New game"
          onPress={() => router.push("/admin/games/new")}
          icon="plus"
        />
      </View>

      {(draftsQuery.error || gamesQuery.error) && (
        <Card>
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            {draftsQuery.error
              ? `Failed to load drafts: ${(draftsQuery.error as Error).message}`
              : `Failed to load games: ${(gamesQuery.error as Error).message}`}
          </Text>
        </Card>
      )}

      {drafts.length > 0 && (
        <>
          <Text variant="titleMedium">In progress</Text>
          {drafts.map((draft) => (
            <DraftRow
              key={draft.id}
              draft={draft}
              onPress={() => router.push(`/admin/games/draft/${draft.id}`)}
            />
          ))}
        </>
      )}

      <Text variant="titleMedium">Published games</Text>
      <Select
        label="Level"
        options={LEVEL_FILTER_OPTIONS}
        value={levelFilter}
        onValueChange={(value) => {
          setLevelFilter(value);
          setPage(1);
        }}
      />

      {games.length === 0 ? (
        <Card>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            No games yet. Create one to get started.
          </Text>
        </Card>
      ) : (
        games.map((game) => (
          <GameRow
            key={game.id}
            game={game}
            onPress={() => router.push(`/admin/games/${game.id}/edit`)}
          />
        ))
      )}

      {totalPages > 1 && (
        <View style={styles.pagination}>
          <Button
            title="Previous"
            variant="outline"
            disabled={page <= 1}
            onPress={() => setPage((p) => p - 1)}
          />
          <Text variant="bodyMedium">
            Page {page} of {totalPages}
          </Text>
          <Button
            title="Next"
            variant="outline"
            disabled={page >= totalPages}
            onPress={() => setPage((p) => p + 1)}
          />
        </View>
      )}
    </ScrollView>
  );
}

function DraftRow({
  draft,
  onPress,
}: {
  draft: GameDraftResponse;
  onPress: () => void;
}) {
  const theme = useTheme();
  const meta = DRAFT_STATUS_META[draft.status] ?? {
    label: draft.status,
    icon: "help-circle-outline",
  };
  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={styles.row}>
          <MaterialCommunityIcons
            name={meta.icon as never}
            size={24}
            color={
              draft.status === "failed"
                ? theme.colors.error
                : theme.colors.primary
            }
          />
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" numberOfLines={1}>
              {draft.title || "Untitled"}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {getVariantName(draft.langVariantCode)} · {draft.level} ·{" "}
              {draft.characters.length}{" "}
              {draft.characters.length === 1 ? "character" : "characters"}
              {draft.status === "failed" && draft.errorCode
                ? ` · ${draft.errorCode}`
                : ""}
            </Text>
          </View>
          <Chip
            mode="flat"
            compact
            style={
              draft.status === "failed"
                ? { backgroundColor: theme.colors.errorContainer }
                : undefined
            }
          >
            {meta.label}
          </Chip>
        </View>
      </Card>
    </Pressable>
  );
}

function GameRow({ game, onPress }: { game: AdminGame; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={styles.row}>
          <MaterialCommunityIcons
            name="gamepad-variant"
            size={24}
            color={theme.colors.primary}
          />
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" numberOfLines={1}>
              {game.title}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {getVariantName(game.langVariantCode)} · {game.level}
              {game.forKids ? " · For kids" : ""}
              {game.sortOrder != null ? ` · #${game.sortOrder}` : ""}
            </Text>
          </View>
          <Chip mode="flat" compact selected={game.isPublished}>
            {game.isPublished ? "Published" : "Unpublished"}
          </Chip>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
});
