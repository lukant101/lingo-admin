import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Chip,
  HelperText,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

import { listDeckTags } from "@/lib/api/decks";
import {
  MAX_TAGS_PER_DECK,
  MAX_TAG_LENGTH,
  normalizeTag,
  validateTag,
} from "@/lib/deckTags";

type TagEditorProps = {
  tags: string[];
  /** Called with the deck's complete new tag set — the API replaces, not merges. */
  onChange: (tags: string[]) => void;
  disabled?: boolean;
};

const MAX_SUGGESTIONS = 8;

/**
 * Chips for the deck's tags plus a free-text field. Tags have no controlled
 * vocabulary, so the field suggests what other decks already use: picking
 * "story" off the list is what stops a fourth spelling of it appearing.
 */
export function TagEditor({ tags, onChange, disabled }: TagEditorProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Suggestions are a nicety — a failed fetch leaves the field fully usable.
  const { data: knownTags } = useQuery({
    queryKey: ["deckTags"],
    queryFn: listDeckTags,
    staleTime: 5 * 60 * 1000,
  });

  const atLimit = tags.length >= MAX_TAGS_PER_DECK;

  const suggestions = useMemo(() => {
    const query = normalizeTag(draft);
    const selected = new Set(tags);
    return (knownTags ?? [])
      .filter(
        ({ tag }) => !selected.has(tag) && (!query || tag.includes(query))
      )
      .slice(0, MAX_SUGGESTIONS);
  }, [knownTags, draft, tags]);

  const addTag = (raw: string) => {
    const tag = normalizeTag(raw);
    if (!tag) return;

    const reason = validateTag(tag);
    if (reason) {
      setError(reason);
      return;
    }
    if (tags.includes(tag)) {
      setDraft("");
      setError(null);
      return;
    }
    if (atLimit) {
      setError(`A deck can have at most ${MAX_TAGS_PER_DECK} tags`);
      return;
    }

    setDraft("");
    setError(null);
    onChange([...tags, tag]);
  };

  const removeTag = (tag: string) => {
    setError(null);
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <View>
      {tags.length > 0 ? (
        <View style={styles.chipRow}>
          {tags.map((tag) => (
            <Chip
              key={tag}
              mode="flat"
              onClose={disabled ? undefined : () => removeTag(tag)}
            >
              {tag}
            </Chip>
          ))}
        </View>
      ) : (
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          No tags yet.
        </Text>
      )}

      <TextInput
        mode="outlined"
        dense
        label="Add a tag"
        value={draft}
        onChangeText={(text) => {
          setDraft(text);
          if (error) setError(null);
        }}
        onSubmitEditing={() => addTag(draft)}
        // Committing on blur too: leaving a typed-but-unadded tag behind is the
        // easiest way to lose it when the save button is the next thing tapped.
        onBlur={() => addTag(draft)}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={MAX_TAG_LENGTH}
        disabled={disabled || atLimit}
        returnKeyType="done"
        right={
          draft.trim() ? (
            <TextInput.Icon icon="plus" onPress={() => addTag(draft)} />
          ) : undefined
        }
        style={styles.input}
        outlineStyle={styles.outline}
      />

      {error ? (
        <HelperText type="error" visible>
          {error}
        </HelperText>
      ) : null}

      {atLimit ? (
        <HelperText type="info" visible>
          Tag limit reached ({MAX_TAGS_PER_DECK}). Remove one to add another.
        </HelperText>
      ) : suggestions.length > 0 ? (
        <>
          <Text
            variant="bodySmall"
            style={[
              styles.suggestLabel,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {draft.trim() ? "Matching tags" : "Used on other decks"}
          </Text>
          <View style={styles.chipRow}>
            {suggestions.map(({ tag, deckCount }) => (
              <Chip
                key={tag}
                mode="outlined"
                compact
                disabled={disabled}
                onPress={() => addTag(tag)}
              >
                {`${tag} (${deckCount})`}
              </Chip>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  input: {
    marginTop: 12,
  },
  outline: {
    borderRadius: 8,
  },
  suggestLabel: {
    marginTop: 12,
    marginBottom: 8,
  },
});
