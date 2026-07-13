import { CollectionPicker } from "@/components/platformDeck/CollectionPicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  StyledSnackbar,
  type SnackbarState,
} from "@/components/ui/StyledSnackbar";
import { getPlatformDeck, listPlatformDeckCollections } from "@/lib/api/decks";
import {
  addDeckToCollection,
  removeDeckFromCollection,
  updateCollectionDeck,
} from "@/lib/api/platformDecks";
import { DIALOG_MAX_WIDTH } from "@/lib/constants";
import type { CollectionResponse } from "@/types/collection";
import type { DeckCollectionMembership } from "@/types/deck";
import type { DeckLevel } from "@/types/langs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Dialog,
  IconButton,
  Portal,
  Switch,
  Text,
  useTheme,
} from "react-native-paper";

type Membership = DeckCollectionMembership;

type CollectionMembershipListProps = {
  deckId: string;
  /**
   * Level to offer collections for. The edit form passes its current (possibly
   * unsaved) selection; elsewhere the deck's saved level is used.
   */
  level?: DeckLevel;
};

export function CollectionMembershipList({
  deckId,
  level,
}: CollectionMembershipListProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["adminPlatformDeckCollections", deckId],
    queryFn: () => listPlatformDeckCollections(deckId),
  });
  // Shares the deck editor's query key, so this is deduped there and costs one
  // request on the draft screens. Only the immutable variant code is needed.
  const { data: deck } = useQuery({
    queryKey: ["adminPlatformDeck", deckId],
    queryFn: () => getPlatformDeck(deckId),
  });
  // Mutations below update rows optimistically, so the fetched list seeds local
  // state rather than driving the render directly.
  const [memberships, setMemberships] = useState<Membership[]>([]);
  useEffect(() => {
    if (data) setMemberships(data);
  }, [data]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerValue, setPickerValue] = useState<CollectionResponse | null>(
    null
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  const setMembership = (idx: number, patch: Partial<Membership>) => {
    setMemberships((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const handleTogglePublished = async (idx: number, value: boolean) => {
    const membership = memberships[idx];
    setMembership(idx, { published: value });
    setBusy(membership.collectionId);
    try {
      await updateCollectionDeck(membership.collectionId, deckId, {
        published: value,
      });
      setSnackbar({
        message: value ? "Deck is now discoverable" : "Deck hidden",
        type: "success",
      });
    } catch (err) {
      // revert on failure
      setMembership(idx, { published: !value });
      setSnackbar({
        message: (err as Error).message || "Failed to update visibility",
        type: "error",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleSortOrderBlur = async (idx: number) => {
    const membership = memberships[idx];
    setBusy(membership.collectionId);
    try {
      await updateCollectionDeck(membership.collectionId, deckId, {
        sortOrder: membership.sortOrder,
      });
      setSnackbar({ message: "Sort order saved", type: "success" });
    } catch (err) {
      setSnackbar({
        message: (err as Error).message || "Failed to save sort order",
        type: "error",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = async (idx: number) => {
    const membership = memberships[idx];
    setBusy(membership.collectionId);
    try {
      await removeDeckFromCollection(membership.collectionId, deckId);
      setMemberships((prev) => prev.filter((_, i) => i !== idx));
      setSnackbar({ message: "Removed from collection", type: "success" });
    } catch (err) {
      setSnackbar({
        message: (err as Error).message || "Failed to remove",
        type: "error",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleAdd = async () => {
    if (!pickerValue) return;
    if (memberships.some((m) => m.collectionId === pickerValue.id)) {
      setSnackbar({
        message: "Already in this collection",
        type: "error",
      });
      setPickerOpen(false);
      return;
    }
    setBusy(pickerValue.id);
    try {
      await addDeckToCollection(pickerValue.id, {
        deckId,
        sortOrder: 0,
        published: true,
      });
      // Refetch rather than construct the row locally: the picker's collection
      // has no langVariantCode, and the server owns the inclusion defaults.
      await queryClient.invalidateQueries({
        queryKey: ["adminPlatformDeckCollections", deckId],
      });
      setSnackbar({ message: "Added to collection", type: "success" });
      setPickerOpen(false);
      setPickerValue(null);
    } catch (err) {
      setSnackbar({
        message: (err as Error).message || "Failed to add",
        type: "error",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <Text
        variant="titleMedium"
        style={{ color: theme.colors.onSurface, marginBottom: 12 }}
      >
        Collections
      </Text>
      {isLoading ? (
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          Loading collections…
        </Text>
      ) : memberships.length === 0 ? (
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          Not in any collections — visible to learners without a collection
          gate.
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {memberships.map((m, i) => (
            <View
              key={m.collectionId}
              style={[styles.row, { borderColor: theme.colors.outlineVariant }]}
            >
              <View style={{ flex: 1 }}>
                <Text variant="titleSmall">{m.title}</Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {m.level} · {m.langVariantCode}
                  {m.forKids ? " · kids" : ""}
                </Text>
              </View>
              <View style={styles.controls}>
                <View style={styles.publishedCell}>
                  <Text
                    variant="labelSmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    Published
                  </Text>
                  <Switch
                    value={m.published}
                    onValueChange={(v) => handleTogglePublished(i, v)}
                    disabled={busy === m.collectionId}
                  />
                </View>
                <View style={styles.sortCell}>
                  <Input
                    label="Order"
                    value={String(m.sortOrder)}
                    keyboardType="numeric"
                    onChangeText={(text) => {
                      const n = parseInt(text, 10);
                      setMembership(i, {
                        sortOrder: Number.isFinite(n) ? n : 0,
                      });
                    }}
                    onBlur={() => handleSortOrderBlur(i)}
                    containerStyle={styles.sortInput}
                  />
                </View>
                <IconButton
                  icon="delete"
                  size={20}
                  onPress={() => handleRemove(i)}
                  disabled={busy === m.collectionId}
                  iconColor={theme.colors.error}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      <Button
        title="Add to another collection"
        variant="outline"
        onPress={() => {
          setPickerValue(null);
          setPickerOpen(true);
        }}
        style={{ marginTop: 16 }}
      />

      <Portal>
        <Dialog
          visible={pickerOpen}
          onDismiss={() => setPickerOpen(false)}
          style={styles.dialog}
        >
          <Dialog.Title>Add to collection</Dialog.Title>
          <Dialog.ScrollArea>
            <View style={{ paddingVertical: 12 }}>
              <CollectionPicker
                value={pickerValue}
                onChange={setPickerValue}
                lockedLangVariantCode={deck?.langVariantCode}
                lockedLevel={level ?? deck?.level}
              />
            </View>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setPickerOpen(false)}
              style={{ flex: 1 }}
            />
            <Button
              title="Add"
              onPress={handleAdd}
              disabled={!pickerValue || busy !== null}
              loading={busy === pickerValue?.id}
              style={{ flex: 1 }}
            />
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <StyledSnackbar snackbar={snackbar} onDismiss={() => setSnackbar(null)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  controls: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  publishedCell: {
    alignItems: "center",
  },
  sortCell: {
    width: 72,
  },
  sortInput: {
    marginBottom: 0,
  },
  dialog: {
    maxWidth: DIALOG_MAX_WIDTH,
    alignSelf: "center",
    width: "100%",
  },
});
