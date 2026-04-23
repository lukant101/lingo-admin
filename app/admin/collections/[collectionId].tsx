import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  createPlatformDeckDraft,
  getCollection,
  listPlatformDeckDrafts,
} from "@/lib/api/platformDecks";
import { DIALOG_MAX_WIDTH } from "@/lib/constants";
import type { CollectionDeckItem } from "@/types/collection";
import type {
  PlatformDeckDraftResponse,
  PlatformDeckDraftStatus,
} from "@/types/platformDeck";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import {
  Dialog,
  Button as PaperButton,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";

const DRAFT_STATUS_META: Record<
  PlatformDeckDraftStatus,
  { label: string; icon: string }
> = {
  draft: { label: "Draft", icon: "pencil-outline" },
  publishing: { label: "Publishing", icon: "progress-upload" },
  published: { label: "Published", icon: "check-circle" },
  failed: { label: "Failed", icon: "alert-circle" },
};

function routeForDraft(draft: PlatformDeckDraftResponse): string {
  if (draft.status === "draft") return `/admin/platform-decks/${draft.id}/edit`;
  if (draft.status === "published")
    return `/admin/platform-decks/${draft.id}/collections`;
  return `/admin/platform-decks/${draft.id}/publish`;
}

export default function CollectionDetailScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { collectionId } = useLocalSearchParams<{ collectionId: string }>();
  const [newDeckOpen, setNewDeckOpen] = useState(false);

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

  const sortedDecks = useMemo(() => {
    if (!data?.decks) return [];
    return [...data.decks].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [data?.decks]);

  const inFlightDrafts = useMemo(() => {
    const drafts = draftsData?.data ?? [];
    return drafts
      .filter((d) => d.status !== "published")
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  }, [draftsData?.data]);

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
});
