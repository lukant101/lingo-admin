import { DIALOG_MAX_WIDTH } from "@/lib/constants";
import { getVariants, searchLanguages } from "@/lib/languages";
import type { LanguageSearchResult } from "@/types/cdn-lang";
import { useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Chip, Dialog, Portal, Text, TextInput } from "react-native-paper";

type LanguageSelection = { code: string; name: string };

type LanguageSearchProps = {
  onSelect: (lang: LanguageSelection) => void;
  value?: LanguageSelection;
  error?: string;
};

export default function LanguageSearch({
  onSelect,
  value,
  error,
}: LanguageSearchProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LanguageSearchResult[] | null>(null);
  const [variantModalCode, setVariantModalCode] = useState<string | null>(null);

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!text.trim()) {
      setResults(null);
      setVariantModalCode(null);
      return;
    }

    timerRef.current = setTimeout(() => {
      setResults(searchLanguages(text));
    }, 300);
  };

  const handleSelectResult = (result: LanguageSearchResult) => {
    if (result.hasVariants) {
      setVariantModalCode(result.code);
      return;
    }
    finishSelection({ code: result.code, name: result.name });
  };

  const handleSelectVariant = (code: string, name: string) => {
    finishSelection({ code, name });
  };

  const finishSelection = (lang: LanguageSelection) => {
    setQuery("");
    setResults(null);
    setVariantModalCode(null);
    onSelect(lang);
  };

  return (
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        label="Language of your content"
        placeholder="Search for a language..."
        value={query}
        onChangeText={handleChangeText}
      />
      {error && (
        <Text variant="bodySmall" style={styles.error}>
          {error}
        </Text>
      )}

      {value && !results && (
        <View style={styles.chipBox}>
          <Chip mode="flat" selected style={styles.chip}>
            {value.name}
          </Chip>
        </View>
      )}

      {results !== null && results.length > 0 && (
        <View style={styles.chipBox}>
          {results.map((result) => (
            <Chip
              key={result.code}
              onPress={() => handleSelectResult(result)}
              mode="outlined"
              style={styles.chip}
              closeIcon={result.hasVariants ? "chevron-down" : undefined}
              onClose={
                result.hasVariants
                  ? () => setVariantModalCode(result.code)
                  : undefined
              }
            >
              {result.name}
            </Chip>
          ))}
        </View>
      )}

      {results !== null && results.length === 0 && (
        <Text variant="bodySmall" style={styles.noResults}>
          No languages found
        </Text>
      )}

      <Portal>
        <Dialog
          visible={variantModalCode !== null}
          onDismiss={() => setVariantModalCode(null)}
          style={styles.dialog}
        >
          <Dialog.Title>
            {results?.find((r) => r.code === variantModalCode)?.name}
          </Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              <View style={styles.variantChipBox}>
                {variantModalCode &&
                  getVariants(variantModalCode).map((variant) => (
                    <Chip
                      key={variant.code}
                      onPress={() =>
                        handleSelectVariant(variant.code, variant.name)
                      }
                      mode="outlined"
                      style={styles.chip}
                    >
                      {variant.variantName ?? variant.name}
                    </Chip>
                  ))}
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  chipBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  variantChipBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingVertical: 16,
  },
  error: {
    color: "#B00020",
    marginTop: 4,
  },
  noResults: {
    marginTop: 8,
    fontStyle: "italic",
  },
  dialog: {
    maxWidth: DIALOG_MAX_WIDTH,
    marginHorizontal: "auto",
  },
});
