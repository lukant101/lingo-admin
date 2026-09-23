import { CollectionPicker } from "@/components/platformDeck/CollectionPicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  StyledSnackbar,
  type SnackbarState,
} from "@/components/ui/StyledSnackbar";
import { getPlatformDeck, listPlatformDeckCollections } from "@/lib/api/decks";
import {
  addDeckToCollection,
  removeDeckFromCollection,
} from "@/lib/api/platformDecks";
import { DECK_SORT_ORDER_HINT, DIALOG_MAX_WIDTH } from "@/lib/constants";
import type { CollectionResponse } from "@/types/collection";
import type { DeckCollectionMembership } from "@/types/deck";
import type { DeckLevel } from "@/types/langs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Dialog, IconButton, Portal, Text, useTheme } from "react-native-paper";

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
  // request on the draft screens. Only the immutable variant code, the level
  // and the sort order are needed.
  const { data: deck } = useQuery({
    queryKey: ["adminPlatformDeck", deckId],
    queryFn: () => getPlatformDeck(deckId),
  });
  // Removal updates rows optimistically, so the fetched list seeds local state
  // rather than driving the render directly.
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
      await addDeckToCollection(pickerValue.id, { deckId });
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
        style={{ color: theme.colors.onSurface, marginBottom: 4 }}
      >
        Collections
      </Text>
      <Text
        variant="bodySmall"
        style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}
      >
        Deck sort order: {deck?.sortOrder ?? "—"}. {DECK_SORT_ORDER_HINT}
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
                <Text
                  variant="labelSmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {m.published ? "Collection published" : "Collection hidden"}
                </Text>
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
    alignItems: "center",
    gap: 8,
  },
  dialog: {
    maxWidth: DIALOG_MAX_WIDTH,
    alignSelf: "center",
    width: "100%",
  },
});
