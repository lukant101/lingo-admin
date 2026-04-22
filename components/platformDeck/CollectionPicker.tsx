import LanguageSearch from "@/components/LanguageSearch";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  createCollection,
  listCollections,
} from "@/lib/api/platformDecks";
import { DECK_LEVELS, DIALOG_MAX_WIDTH } from "@/lib/constants";
import type { CollectionResponse } from "@/types/collection";
import type { DeckLevel } from "@/types/langs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Chip,
  Dialog,
  Portal,
  Switch,
  Text,
  useTheme,
} from "react-native-paper";

type CollectionPickerProps = {
  value: CollectionResponse | null;
  onChange: (collection: CollectionResponse) => void;
  disabled?: boolean;
};

type LangSelection = { code: string; name: string } | null;

export function CollectionPicker({
  value,
  onChange,
  disabled,
}: CollectionPickerProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [lang, setLang] = useState<LangSelection>(null);
  const [level, setLevel] = useState<DeckLevel | null>(null);
  const [forKids, setForKids] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createMature, setCreateMature] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const queryEnabled = !disabled && !!lang;

  const filters = useMemo(
    () => ({
      langVariantId: lang?.code,
      level: level ?? undefined,
      forKids,
      pageSize: 20,
    }),
    [lang?.code, level, forKids]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["collections", filters],
    queryFn: () => listCollections(filters),
    enabled: queryEnabled,
  });

  const createMutation = useMutation({
    mutationFn: createCollection,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      setCreateDialogOpen(false);
      setCreateTitle("");
      setCreateMature(false);
      setCreateError(null);
      onChange(created);
    },
    onError: (err: Error) => {
      setCreateError(err.message || "Failed to create collection");
    },
  });

  // Read-only mode: show the selected collection as a chip.
  if (disabled) {
    if (!value) return null;
    return (
      <View style={styles.container}>
        <Text
          variant="labelMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          Collection
        </Text>
        <View style={styles.chipRow}>
          <Chip mode="flat" selected icon="folder">
            {value.title}
          </Chip>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {value.level} · {value.langVariantId}
            {value.forKids ? " · kids" : ""}
          </Text>
        </View>
      </View>
    );
  }

  const canCreate =
    !!lang && !!level && createTitle.trim().length > 0 && !createMutation.isPending;

  return (
    <View style={styles.container}>
      <Text
        variant="titleMedium"
        style={{ color: theme.colors.onSurface, marginBottom: 4 }}
      >
        Collection
      </Text>
      <Text
        variant="bodySmall"
        style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}
      >
        Pick filters below, then choose an existing collection or create a new
        one.
      </Text>

      <LanguageSearch value={lang ?? undefined} onSelect={setLang} />

      <Text
        variant="labelMedium"
        style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}
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
            style={styles.chip}
          >
            {l}
          </Chip>
        ))}
      </View>

      <View style={styles.switchRow}>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurface }}
        >
          For kids
        </Text>
        <Switch value={forKids} onValueChange={setForKids} />
      </View>

      {!queryEnabled && (
        <Text
          variant="bodySmall"
          style={{
            color: theme.colors.onSurfaceVariant,
            fontStyle: "italic",
            marginTop: 8,
          }}
        >
          Pick a language to load collections.
        </Text>
      )}

      {queryEnabled && isLoading && (
        <ActivityIndicator style={{ marginTop: 16 }} />
      )}

      {queryEnabled && error && (
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.error, marginTop: 8 }}
        >
          Failed to load collections: {(error as Error).message}
        </Text>
      )}

      {queryEnabled && data && (
        <View style={{ marginTop: 12, gap: 8 }}>
          {data.data.length === 0 ? (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              No collections match these filters.
            </Text>
          ) : (
            data.data.map((c) => (
              <Chip
                key={c.id}
                mode={value?.id === c.id ? "flat" : "outlined"}
                selected={value?.id === c.id}
                icon="folder"
                onPress={() => onChange(c)}
                style={styles.resultChip}
              >
                {c.title} · {c.level}
                {c.forKids ? " · kids" : ""}
                {c.mature ? " · mature" : ""}
              </Chip>
            ))
          )}

          <Button
            title="Create new collection"
            variant="outline"
            onPress={() => {
              setCreateError(null);
              setCreateDialogOpen(true);
            }}
            style={{ marginTop: 8 }}
          />
        </View>
      )}

      <Portal>
        <Dialog
          visible={createDialogOpen}
          onDismiss={() => setCreateDialogOpen(false)}
          style={styles.dialog}
        >
          <Dialog.Title>New collection</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              <View style={{ paddingVertical: 12, gap: 12 }}>
                <Input
                  label="Title"
                  value={createTitle}
                  onChangeText={setCreateTitle}
                  maxLength={200}
                />
                <View>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    Language: {lang?.name ?? "—"}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    Level: {level ?? "—"}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    For kids: {forKids ? "yes" : "no"}
                  </Text>
                </View>
                <View style={styles.switchRow}>
                  <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.onSurface }}
                  >
                    Mature content
                  </Text>
                  <Switch
                    value={createMature}
                    onValueChange={setCreateMature}
                  />
                </View>
                {createError && (
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.error }}
                  >
                    {createError}
                  </Text>
                )}
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setCreateDialogOpen(false)}
              style={{ flex: 1 }}
            />
            <Button
              title="Create"
              loading={createMutation.isPending}
              disabled={!canCreate}
              onPress={() => {
                if (!lang || !level) return;
                createMutation.mutate({
                  title: createTitle,
                  langVariantId: lang.code,
                  level,
                  forKids,
                  mature: createMature,
                });
              }}
              style={{ flex: 1 }}
            />
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
    alignItems: "center",
  },
  chip: {
    marginRight: 4,
  },
  resultChip: {
    alignSelf: "flex-start",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  dialog: {
    maxWidth: DIALOG_MAX_WIDTH,
    alignSelf: "center",
    width: "100%",
  },
});
