import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  createPlatformDeckDraft,
  getCollection,
  listPlatformDeckDrafts,
  updateCollection,
  updateCollectionDeck,
} from "@/lib/api/platformDecks";
import {
  DECK_SORT_ORDER_HINT,
  DECK_SORT_ORDER_UNPLACED,
  DIALOG_MAX_WIDTH,
} from "@/lib/constants";
import type { CollectionDeckItem } from "@/types/collection";
import type {
  PlatformDeckDraftResponse,
  PlatformDeckDraftStatus,
} from "@/types/platformDeck";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import {
  Dialog,
  IconButton,
  Button as PaperButton,
  Portal,
  Switch,
  Text,
  useTheme,
} from "react-native-paper";

const DRAFT_STATUS_META: Record<
  PlatformDeckDraftStatus,
  { label: string; icon: string }
> = {
  draft: { label: "Draft", icon: "pencil-outline" },
  processing_started: { label: "Publishing", icon: "progress-upload" },
  processing_completed: { label: "Published", icon: "check-circle" },
  failed: { label: "Failed", icon: "alert-circle" },
};

const SERIES_HINT =
  "Learners see only the first published deck of a series in their feed, and read the rest from it in this order. Move a deck with the arrows; a deck's own sort order no longer places it.";

/**
 * The order learners see: a series' own (position in the collection, then the
 * deck's sort order), or the feed's (the deck's sort order). Ties by id, as
 * the API breaks them.
 */
function learnerOrder(
  decks: CollectionDeckItem[],
  isSeries: boolean
): CollectionDeckItem[] {
  return [...decks].sort(
    (a, b) =>
      (isSeries ? a.sortOrder - b.sortOrder : 0) ||
      (a.deckSortOrder ?? DECK_SORT_ORDER_UNPLACED) -
        (b.deckSortOrder ?? DECK_SORT_ORDER_UNPLACED) ||
      a.deckId.localeCompare(b.deckId)
  );
}

function routeForDraft(draft: PlatformDeckDraftResponse): string {
  if (draft.status === "draft") return `/admin/platform-decks/${draft.id}/edit`;
  if (draft.status === "processing_completed")
    return `/admin/platform-decks/${draft.id}/collections`;
  return `/admin/platform-decks/${draft.id}/publish`;
}

export default function CollectionDetailScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { collectionId } = useLocalSearchParams<{ collectionId: string }>();
  const [newDeckOpen, setNewDeckOpen] = useState(false);
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["collection", collectionId],
    queryFn: () => getCollection(collectionId!),
    enabled: !!collectionId,
  });

  const { data: draftsData } = useQuery({
    queryKey: ["platformDecks", "drafts", "byCollection", collectionId],
    queryFn: () =>
      listPlatformDeckDrafts({ collectionId: collectionId!, pageSize: 50 }),
    enabled: !!collectionId,
  });

  useFocusEffect(
    useCallback(() => {
      if (!collectionId) return;
      queryClient.invalidateQueries({
        queryKey: ["platformDecks", "drafts", "byCollection", collectionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["collection", collectionId],
      });
    }, [collectionId, queryClient])
  );

  const isSeries = data?.isSeries ?? false;

  const sortedDecks = useMemo(
    () => (data?.decks ? learnerOrder(data.decks, isSeries) : []),
    [data?.decks, isSeries]
  );

  // The deck the learner feed shows for a series: its first published one.
  const feedDeckId = isSeries
    ? sortedDecks.find((d) => d.published)?.deckId
    : undefined;

  // Moving a deck numbers the whole series 0, 1, 2… in its new order, so the
  // order no longer hangs on the decks' own sort orders. Only the decks whose
  // position changes are written.
  const reorder = useMutation({
    mutationFn: async (order: CollectionDeckItem[]) => {
      await Promise.all(
        order.map((deck, i) =>
          deck.sortOrder === i
            ? null
            : updateCollectionDeck(collectionId!, deck.deckId, {
                sortOrder: i,
              })
        )
      );
    },
    onMutate: () => setReorderError(null),
    onError: (err: Error) =>
      setReorderError(err.message || "Failed to reorder decks"),
    // Refetch either way: a move that failed partway has changed some
    // positions and not others.
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["collection", collectionId] }),
  });

  const move = (index: number, by: -1 | 1) => {
    const order = [...sortedDecks];
    [order[index], order[index + by]] = [order[index + by], order[index]];
    reorder.mutate(order);
  };

  const inFlightDrafts = useMemo(() => {
    const drafts = draftsData?.data ?? [];
    return drafts
      .filter((d) => d.status !== "processing_completed")
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  }, [draftsData?.data]);

  if (!collectionId) return null;

  const tags: string[] = data ? [data.level] : [];
  if (data?.forKids) tags.push("kids");
  if (data?.mature) tags.push("mature");
  if (isSeries) tags.push("series");

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

            <Card>
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium">Series</Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    Read in order, like the chapters of a book.
                  </Text>
                </View>
                <Switch
                  value={isSeries}
                  onValueChange={() => setSeriesDialogOpen(true)}
                />
              </View>
            </Card>

            <PaperButton
              mode="contained"
              icon="plus"
              onPress={() => setNewDeckOpen(true)}
              style={styles.newButton}
            >
              New deck
            </PaperButton>

            {inFlightDrafts.length > 0 && (
              <>
                <Text
                  variant="titleSmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  Drafts in progress
                </Text>
                <View style={styles.list}>
                  {inFlightDrafts.map((draft) => (
                    <DraftRow key={draft.id} draft={draft} />
                  ))}
                </View>
              </>
            )}

            <View style={styles.header}>
              <Text
                variant="titleSmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Decks
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {isSeries ? SERIES_HINT : DECK_SORT_ORDER_HINT}
              </Text>
            </View>

            {reorderError && (
              <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                {reorderError}
              </Text>
            )}

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
                {sortedDecks.map((deck, i) => (
                  <DeckRow
                    key={deck.deckId}
                    deck={deck}
                    series={
                      isSeries
                        ? {
                            chapter: i + 1,
                            inFeed: deck.deckId === feedDeckId,
                            onUp: i > 0 ? () => move(i, -1) : undefined,
                            onDown:
                              i < sortedDecks.length - 1
                                ? () => move(i, 1)
                                : undefined,
                            busy: reorder.isPending,
                          }
                        : undefined
                    }
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
      {collectionId && data && (
        <SeriesDialog
          visible={seriesDialogOpen}
          collectionId={collectionId}
          isSeries={isSeries}
          onDismiss={() => setSeriesDialogOpen(false)}
        />
      )}
      {collectionId && (
        <NewDeckDialog
          visible={newDeckOpen}
          collectionId={collectionId}
          onDismiss={() => setNewDeckOpen(false)}
        />
      )}
    </>
  );
}

type SeriesDialogProps = {
  visible: boolean;
  collectionId: string;
  isSeries: boolean;
  onDismiss: () => void;
};

/**
 * Turning a series on or off changes what every learner's feed shows, so it
 * is confirmed rather than flipped by the switch alone.
 */
function SeriesDialog({
  visible,
  collectionId,
  isSeries,
  onDismiss,
}: SeriesDialogProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [err, setErr] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => updateCollection(collectionId, { isSeries: !isSeries }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      setErr(null);
      onDismiss();
    },
    // The API refuses a series whose decks are not all of the collection's
    // level and audience, or one of which is already in another series, and
    // says which deck.
    onError: (error: Error) => {
      setErr(error.message || "Failed to update the collection");
    },
  });

  const handleDismiss = () => {
    if (mutation.isPending) return;
    setErr(null);
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleDismiss} style={styles.dialog}>
        <Dialog.Title>
          {isSeries ? "Stop serving as a series?" : "Make this a series?"}
        </Dialog.Title>
        <Dialog.Content>
          <View style={styles.dialogBody}>
            <Text variant="bodyMedium">
              {isSeries
                ? "Every published deck in this collection will appear in learners' feeds as an ordinary deck, in its own sort order."
                : "Learners will see only the first published deck of this collection in their feed, and read the rest from it in order. Check the order of the decks first: it is the order shown on this screen once the collection is a series."}
            </Text>
            {err && (
              <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                {err}
              </Text>
            )}
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            title="Cancel"
            variant="outline"
            onPress={handleDismiss}
            disabled={mutation.isPending}
            style={{ flex: 1 }}
          />
          <Button
            title={isSeries ? "Stop series" : "Make series"}
            loading={mutation.isPending}
            disabled={mutation.isPending}
            onPress={() => {
              setErr(null);
              mutation.mutate();
            }}
            style={{ flex: 1 }}
          />
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

type NewDeckDialogProps = {
  visible: boolean;
  collectionId: string;
  onDismiss: () => void;
};

function NewDeckDialog({
  visible,
  collectionId,
  onDismiss,
}: NewDeckDialogProps) {
  const theme = useTheme();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: createPlatformDeckDraft,
    onSuccess: (draft) => {
      setTitle("");
      setErr(null);
      onDismiss();
      router.push(`/admin/platform-decks/${draft.id}/edit` as never);
    },
    onError: (error: Error) => {
      setErr(error.message || "Failed to create deck");
    },
  });

  const canCreate = title.trim().length > 0 && !mutation.isPending;

  const handleDismiss = () => {
    if (mutation.isPending) return;
    setTitle("");
    setErr(null);
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleDismiss} style={styles.dialog}>
        <Dialog.Title>New deck</Dialog.Title>
        <Dialog.Content>
          <View style={styles.dialogBody}>
            <Input
              label="Deck title"
              value={title}
              onChangeText={setTitle}
              maxLength={200}
            />
            {err && (
              <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                {err}
              </Text>
            )}
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            title="Cancel"
            variant="outline"
            onPress={handleDismiss}
            disabled={mutation.isPending}
            style={{ flex: 1 }}
          />
          <Button
            title="Create"
            loading={mutation.isPending}
            disabled={!canCreate}
            onPress={() => {
              setErr(null);
              mutation.mutate({ title, collectionId });
            }}
            style={{ flex: 1 }}
          />
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

function DraftRow({ draft }: { draft: PlatformDeckDraftResponse }) {
  const theme = useTheme();
  const router = useRouter();
  const meta = DRAFT_STATUS_META[draft.status];
  const updated = new Date(draft.updatedAt).toLocaleDateString();
  return (
    <Pressable onPress={() => router.push(routeForDraft(draft) as never)}>
      <Card>
        <View style={styles.deckRow}>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" numberOfLines={1}>
              {draft.title || "Untitled"}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Updated {updated}
            </Text>
          </View>
          <View style={styles.statusCell}>
            <MaterialCommunityIcons
              name={meta.icon as never}
              size={18}
              color={
                draft.status === "failed"
                  ? theme.colors.error
                  : theme.colors.onSurfaceVariant
              }
            />
            <Text
              variant="labelSmall"
              style={{
                color:
                  draft.status === "failed"
                    ? theme.colors.error
                    : theme.colors.onSurfaceVariant,
              }}
            >
              {meta.label}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

type SeriesPlace = {
  chapter: number;
  /** The deck the learner feed shows for the series. */
  inFeed: boolean;
  onUp?: () => void;
  onDown?: () => void;
  busy: boolean;
};

function DeckRow({
  deck,
  series,
}: {
  deck: CollectionDeckItem;
  series?: SeriesPlace;
}) {
  const theme = useTheme();
  const router = useRouter();
  const detail = series
    ? [`chapter ${series.chapter}`, series.inFeed ? "shown in the feed" : null]
        .filter(Boolean)
        .join(" · ")
    : `sort order: ${deck.deckSortOrder ?? "—"}`;
  return (
    <Pressable
      onPress={() => router.push(`/admin/decks/${deck.deckId}` as never)}
    >
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
              {detail}
            </Text>
          </View>
          {series && (
            <View style={styles.moveCell}>
              <IconButton
                icon="chevron-up"
                size={18}
                accessibilityLabel="Move up"
                disabled={!series.onUp || series.busy}
                onPress={series.onUp}
              />
              <IconButton
                icon="chevron-down"
                size={18}
                accessibilityLabel="Move down"
                disabled={!series.onDown || series.busy}
                onPress={series.onDown}
              />
            </View>
          )}
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
    </Pressable>
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
  newButton: {
    alignSelf: "flex-start",
  },
  list: {
    gap: 8,
  },
  dialog: {
    width: "90%",
    maxWidth: DIALOG_MAX_WIDTH,
    marginHorizontal: "auto",
  },
  dialogBody: {
    gap: 12,
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
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  moveCell: {
    flexDirection: "row",
  },
});
