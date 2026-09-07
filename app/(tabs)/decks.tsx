import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

import LanguageSearch from "@/components/LanguageSearch";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import { useSelectedLanguage } from "@/hooks/useSelectedLanguage";
import { listPlatformDecks } from "@/lib/api/decks";
import { DECK_LEVELS } from "@/lib/constants";
import type { PlatformDeckSummary } from "@/types/deck";
import type { DeckLevel } from "@/types/langs";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

const LEVEL_FILTER_OPTIONS = [
  { label: "All levels", value: "all" },
  ...DECK_LEVELS.map((level) => ({ label: level, value: level })),
];

const KIDS_FILTER_OPTIONS = [
  { label: "Everyone", value: "all" },
  { label: "Kids only", value: "kids" },
];

const PLUS_FILTER_OPTIONS = [
  { label: "Free and Plus", value: "all" },
  { label: "Plus only", value: "plus" },
  { label: "Free only", value: "free" },
];

export default function DecksLandingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { lang, setLang } = useSelectedLanguage();
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [kidsFilter, setKidsFilter] = useState<string>("all");
  const [plusFilter, setPlusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  // The catalogue runs to thousands of decks, so don't query per keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search]);

  const decksQuery = useQuery({
    queryKey: [
      "adminPlatformDecks",
      lang?.code,
      page,
      levelFilter,
      kidsFilter,
      plusFilter,
      debouncedSearch,
    ],
    queryFn: () =>
      listPlatformDecks({
        langVariantCode: lang!.code,
        page,
        pageSize: PAGE_SIZE,
        level: levelFilter === "all" ? undefined : (levelFilter as DeckLevel),
        forKids: kidsFilter === "kids" ? true : undefined,
        isPremium: plusFilter === "all" ? undefined : plusFilter === "plus",
        search: debouncedSearch,
      }),
    enabled: !!lang,
    placeholderData: (previous) => previous,
  });

  if (!lang) {
    return <LoadingSpinner message="Loading decks..." />;
  }

  const decks = decksQuery.data?.data ?? [];
  const total = decksQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text variant="headlineSmall">Decks</Text>
      <Text
        variant="bodySmall"
        style={{ color: theme.colors.onSurfaceVariant }}
      >
        Every platform deck, whether or not it belongs to a collection.
      </Text>

      <LanguageSearch value={lang} onSelect={setLang} />

      <Input
        label="Search titles"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
      />

      <View style={styles.filters}>
        <Select
          label="Level"
          options={LEVEL_FILTER_OPTIONS}
          value={levelFilter}
          onValueChange={(value) => {
            setLevelFilter(value);
            setPage(1);
          }}
          containerStyle={styles.filter}
        />
        <Select
          label="Audience"
          options={KIDS_FILTER_OPTIONS}
          value={kidsFilter}
          onValueChange={(value) => {
            setKidsFilter(value);
            setPage(1);
          }}
          containerStyle={styles.filter}
        />
        <Select
          label="Tier"
          options={PLUS_FILTER_OPTIONS}
          value={plusFilter}
          onValueChange={(value) => {
            setPlusFilter(value);
            setPage(1);
          }}
          containerStyle={styles.filter}
        />
      </View>

      {decksQuery.error && (
        <Card>
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            Failed to load decks: {(decksQuery.error as Error).message}
          </Text>
        </Card>
      )}

      {decksQuery.isLoading ? (
        <LoadingSpinner message="Loading decks..." />
      ) : decks.length === 0 ? (
        <Card>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {debouncedSearch
              ? `No decks matching "${debouncedSearch}" for ${lang.name}.`
              : `No decks for ${lang.name} yet.`}
          </Text>
        </Card>
      ) : (
        <>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {total} deck{total === 1 ? "" : "s"}
          </Text>
          {decks.map((deck) => (
            <DeckRow
              key={deck.id}
              deck={deck}
              onPress={() => router.push(`/admin/decks/${deck.id}` as never)}
            />
          ))}
        </>
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

function DeckRow({
  deck,
  onPress,
}: {
  deck: PlatformDeckSummary;
  onPress: () => void;
}) {
  const theme = useTheme();
  const meta = [deck.level, `${deck.cardCount} cards`];
  if (deck.forKids) meta.push("kids");
  if (deck.isPremium) meta.push("Plus");
  if (deck.hasVideo) meta.push("video");
  if (deck.audioUrl) meta.push("audio");

  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={styles.row}>
          <MaterialCommunityIcons
            name="cards-outline"
            size={24}
            color={theme.colors.primary}
          />
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" numberOfLines={1}>
              {deck.title || "Untitled"}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {meta.join(" · ")}
            </Text>
            {/* Tags are edited on the deck screen; showing them here is what
                makes an untagged deck visible without opening it. The optional
                chain covers an API deployed before tags existed. */}
            {deck.tags?.length > 0 && (
              <Text
                variant="bodySmall"
                numberOfLines={1}
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {deck.tags.map((tag) => `#${tag}`).join(" ")}
              </Text>
            )}
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={theme.colors.onSurfaceVariant}
          />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  filters: {
    flexDirection: "row",
    gap: 12,
  },
  filter: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
});
