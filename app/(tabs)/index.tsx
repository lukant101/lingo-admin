import LanguageSearch from "@/components/LanguageSearch";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { listCollections } from "@/lib/api/platformDecks";
import type { CollectionResponse } from "@/types/collection";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

type LangSelection = { code: string; name: string };

const DEFAULT_LANG: LangSelection = { code: "en-ca", name: "English (Canadian)" };

export default function AdminLandingScreen() {
  const theme = useTheme();
  const [lang, setLang] = useState<LangSelection>(DEFAULT_LANG);

  const { data, isLoading, error } = useQuery({
    queryKey: ["collections", "byLang", lang.code],
    queryFn: () =>
      listCollections({ langVariantId: lang.code, pageSize: 50 }),
  });

  const collections = data?.data ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text variant="headlineSmall">Platform deck collections</Text>

      <LanguageSearch value={lang} onSelect={setLang} />

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

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
  list: {
    gap: 8,
  },
});
