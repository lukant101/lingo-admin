import LanguageSearch from "@/components/LanguageSearch";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  useSelectedLanguage,
  type LanguageSelection,
} from "@/hooks/useSelectedLanguage";
import { createCollection, listCollections } from "@/lib/api/platformDecks";
import { DECK_LEVELS, DIALOG_MAX_WIDTH } from "@/lib/constants";
import type { CollectionResponse } from "@/types/collection";
import type { DeckLevel } from "@/types/langs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Button as PaperButton,
  Chip,
  Dialog,
  Portal,
  Switch,
  Text,
  useTheme,
} from "react-native-paper";

export default function AdminLandingScreen() {
  const theme = useTheme();
  const { lang, setLang } = useSelectedLanguage();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["collections", "byLang", lang?.code],
    queryFn: () =>
      listCollections({ langVariantCode: lang!.code, pageSize: 50 }),
    enabled: !!lang,
  });

  if (!lang) {
    return <LoadingSpinner message="Loading..." />;
  }

  const collections = data?.data ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text variant="headlineSmall">Collections</Text>

      <LanguageSearch value={lang} onSelect={setLang} />

      <PaperButton
        mode="contained"
        icon="plus"
        onPress={() => setCreateOpen(true)}
        style={styles.newButton}
      >
        New collection
      </PaperButton>

      {isLoading && <LoadingSpinner message="Loading collections..." />}

      {error && !isLoading && (
        <Card>
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            Failed to load collections: {(error as Error).message}
          </Text>
        </Card>
      )}

      {!isLoading && !error && collections.length === 0 && (
        <Card>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            No collections for {lang.name} yet.
          </Text>
        </Card>
      )}

      {!isLoading && !error && collections.length > 0 && (
        <View style={styles.list}>
          {collections.map((c) => (
            <CollectionRow key={c.id} collection={c} />
          ))}
        </View>
      )}

      <NewCollectionDialog
        visible={createOpen}
        lang={lang}
        onDismiss={() => setCreateOpen(false)}
      />
    </ScrollView>
  );
}

function CollectionRow({ collection }: { collection: CollectionResponse }) {
  const theme = useTheme();
  const tags: string[] = [collection.level];
  if (collection.forKids) tags.push("kids");
  if (collection.mature) tags.push("mature");

  return (
    <Card>
      <Text variant="titleMedium" numberOfLines={1}>
        {collection.title}
      </Text>
      <Text
        variant="bodySmall"
        style={{ color: theme.colors.onSurfaceVariant }}
      >
        {tags.join(" · ")}
      </Text>
    </Card>
  );
}

type NewCollectionDialogProps = {
  visible: boolean;
  lang: LanguageSelection;
  onDismiss: () => void;
};

function NewCollectionDialog({
  visible,
  lang,
  onDismiss,
}: NewCollectionDialogProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<DeckLevel | null>(null);
  const [forKids, setForKids] = useState(false);
  const [mature, setMature] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setLevel(null);
    setForKids(false);
    setMature(false);
    setError(null);
  };

  const mutation = useMutation({
    mutationFn: createCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections", "byLang", lang.code] });
      reset();
      onDismiss();
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to create collection");
    },
  });

  const canCreate =
    title.trim().length > 0 && !!level && !mutation.isPending;

  const handleDismiss = () => {
    if (mutation.isPending) return;
    reset();
    onDismiss();
  };

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={handleDismiss}
        style={styles.dialog}
      >
        <Dialog.Title>New collection</Dialog.Title>
        <Dialog.ScrollArea>
          <ScrollView>
            <View style={styles.dialogBody}>
              <Input
                label="Title"
                value={title}
                onChangeText={setTitle}
                maxLength={200}
              />

              <View>
                <Text
                  variant="labelMedium"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  Language
                </Text>
                <Text variant="bodyMedium">{lang.name}</Text>
              </View>

              <View>
                <Text
                  variant="labelMedium"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    marginBottom: 4,
                  }}
                >
                  Level
                </Text>
                <View style={styles.chipRow}>
                  {DECK_LEVELS.map((l) => (
                    <Chip
                      key={l}
                      mode="outlined"
                      selected={level === l}
                      onPress={() => setLevel(level === l ? null : l)}
                    >
                      {l}
                    </Chip>
                  ))}
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text variant="bodyMedium">For kids</Text>
                <Switch value={forKids} onValueChange={setForKids} />
              </View>

              <View style={styles.switchRow}>
                <Text variant="bodyMedium">Mature content</Text>
                <Switch value={mature} onValueChange={setMature} />
              </View>

              {error && (
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.error }}
                >
                  {error}
                </Text>
              )}
            </View>
          </ScrollView>
        </Dialog.ScrollArea>
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
              if (!level) return;
              setError(null);
              mutation.mutate({
                title,
                langVariantCode: lang.code,
                level,
                forKids,
                mature,
              });
            }}
            style={{ flex: 1 }}
          />
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
  newButton: {
    alignSelf: "flex-start",
  },
  list: {
    gap: 8,
  },
  dialog: {
    maxWidth: DIALOG_MAX_WIDTH,
    alignSelf: "center",
    width: "100%",
  },
  dialogBody: {
    paddingVertical: 12,
    gap: 16,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
