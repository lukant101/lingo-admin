import { StudioCard } from "@/components/StudioCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  StyledSnackbar,
  type SnackbarState,
} from "@/components/ui/StyledSnackbar";
import { COLORS } from "@/constants/theme";
import { useCreatorAccount } from "@/contexts/CreatorAccountContext";
import { createStore, getStore, updateStore } from "@/lib/api/stores";
import { listStudios } from "@/lib/api/submissions";
import { getVariantName } from "@/lib/languages";
import type { StudioSettings } from "@/types/studio";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Chip, Divider, Text, useTheme } from "react-native-paper";

export default function ContentScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { creatorAccount, isLoading: isAccountLoading } = useCreatorAccount();

  const queryClient = useQueryClient();
  const isActiveCreator = creatorAccount?.creatorStatus === "active";
  const [selectedLang, setSelectedLang] = useState<string | null>(
    creatorAccount?.langVariantCodes?.[0] ?? null
  );
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    if (!selectedLang && creatorAccount?.langVariantCodes?.[0]) {
      setSelectedLang(creatorAccount.langVariantCodes[0]);
    }
  }, [creatorAccount?.langVariantCodes]);

  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ["store"],
    queryFn: getStore,
    enabled: isActiveCreator,
    retry: false,
  });

  // Inline store name editing state
  const [editingStoreName, setEditingStoreName] = useState(false);
  const [editStoreNameValue, setEditStoreNameValue] = useState("");
  const [savingStoreName, setSavingStoreName] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  const handleStartEditStoreName = () => {
    setEditStoreNameValue(store?.name ?? "");
    setEditingStoreName(true);
  };

  const handleCancelEditStoreName = () => {
    setEditingStoreName(false);
    setEditStoreNameValue("");
  };

  const handleSaveStoreName = async () => {
    const trimmed = editStoreNameValue.trim();
    if (!trimmed) {
      setSnackbar({ message: "Store name cannot be empty", type: "error" });
      return;
    }

    setSavingStoreName(true);
    try {
      if (store) {
        await updateStore({ name: trimmed });
      } else {
        await createStore({ name: trimmed });
      }
      await queryClient.invalidateQueries({ queryKey: ["store"] });
      setEditingStoreName(false);
      setSnackbar({ message: "Store name updated", type: "success" });
    } catch (err) {
      console.error("Failed to update store name:", err);
      setSnackbar({
        message: "Failed to update store name. Please try again.",
        type: "error",
      });
    } finally {
      setSavingStoreName(false);
    }
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["studios", selectedLang, sortOrder],
    queryFn: () =>
      listStudios({ langVariantCode: selectedLang!, sort: sortOrder }),
    enabled: isActiveCreator && !!selectedLang,
  });

  if (isAccountLoading) {
    return <LoadingSpinner />;
  }

  if (!isActiveCreator) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.colors.background }]}
      >
        <Text variant="titleMedium" style={{ textAlign: "center" }}>
          You need an approved creator account to manage content.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading studios..." />;
  }

  if (error) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.colors.background }]}
      >
        <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
          Failed to load studios
        </Text>
        <Button
          title="Retry"
          onPress={() => refetch()}
          variant="outline"
          style={styles.retryButton}
        />
      </View>
    );
  }

  const studios = data ?? [];

  const renderStudio = ({ item }: { item: StudioSettings }) => (
    <StudioCard
      name={item.name}
      level={item.level}
      logoUrl={item.logoUrl}
      isForSale={item.isForSale}
      onPress={() => router.push(`/studios/${item.id}`)}
    />
  );

  const storeNameHeader = storeLoading ? null : (
    <Card style={styles.storeNameCard}>
      <View style={styles.storeNameHeaderRow}>
        <FontAwesome
          name="shopping-bag"
          size={18}
          color={theme.colors.primary}
        />
        <Text
          variant="titleMedium"
          style={{ color: theme.colors.onSurface, marginLeft: 8 }}
        >
          Store Name
        </Text>
      </View>
      {editingStoreName ? (
        <>
          <View style={styles.editRow}>
            <Input
              value={editStoreNameValue}
              onChangeText={setEditStoreNameValue}
              maxLength={50}
              containerStyle={{ flex: 1, marginBottom: 0 }}
            />
            <Pressable
              onPress={handleSaveStoreName}
              disabled={savingStoreName}
              style={styles.iconButton}
            >
              <FontAwesome
                name="check"
                size={18}
                color={COLORS.SUCCESS_GREEN}
              />
            </Pressable>
            <Pressable
              onPress={handleCancelEditStoreName}
              style={styles.iconButton}
            >
              <FontAwesome name="times" size={18} color={theme.colors.error} />
            </Pressable>
          </View>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}
          >
            This name will be displayed on your store pages. You can change it
            at any time.
          </Text>
        </>
      ) : (
        <View style={styles.editRow}>
          {store?.name ? (
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
              {store.name}
            </Text>
          ) : (
            <Text
              variant="bodyLarge"
              style={{
                color: theme.colors.onSurfaceVariant,
                fontStyle: "italic",
              }}
            >
              Tap the pencil to set your store name
            </Text>
          )}
          <Pressable
            onPress={handleStartEditStoreName}
            style={styles.iconButton}
          >
            <FontAwesome name="pencil" size={16} color={theme.colors.primary} />
          </Pressable>
        </View>
      )}
    </Card>
  );

  const languageChips =
    creatorAccount?.langVariantCodes &&
    creatorAccount.langVariantCodes.length > 0 ? (
      <View style={styles.languageChipRow}>
        <View style={styles.chipList}>
          {creatorAccount.langVariantCodes.map((code) => (
            <Chip
              key={code}
              mode="outlined"
              compact
              selected={code === selectedLang}
              onPress={() => {
                if (creatorAccount.langVariantCodes!.length > 1) {
                  setSelectedLang(code);
                }
              }}
              style={styles.languageChip}
            >
              {getVariantName(code)}
            </Chip>
          ))}
        </View>
        <Pressable
          onPress={() =>
            setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
          }
          style={styles.sortButton}
        >
          <FontAwesome
            name={sortOrder === "desc" ? "sort-amount-desc" : "sort-amount-asc"}
            size={18}
            color={theme.colors.onSurfaceVariant}
          />
        </Pressable>
      </View>
    ) : (
      <Text
        variant="bodyMedium"
        style={{
          color: theme.colors.error,
          paddingHorizontal: 16,
          marginTop: 24,
        }}
      >
        No languages configured. Please contact support.
      </Text>
    );

  const hasStoreName = !!store?.name;
  const createStudioButton = selectedLang ? (
    <View style={styles.createStudioButtonContainer}>
      <Button
        title="Create Studio"
        disabled={!hasStoreName}
        onPress={() => {
          setSortOrder("desc");
          router.push(`/studio/new?lang=${selectedLang}`);
        }}
      />
    </View>
  ) : null;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <FlatList
        data={studios}
        keyExtractor={(item) => item.id}
        renderItem={renderStudio}
        ItemSeparatorComponent={() => <Divider />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {storeNameHeader}
            {languageChips}
            {createStudioButton}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text
              variant="bodyLarge"
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: "center",
              }}
            >
              {store?.name
                ? "No studios found."
                : "Before creating studios, you need to give a name to your store."}
            </Text>
          </View>
        }
      />

      <StyledSnackbar snackbar={snackbar} onDismiss={() => setSnackbar(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  list: {
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  retryButton: {
    marginTop: 12,
  },
  storeNameCard: {
    margin: 16,
    marginBottom: 8,
  },
  storeNameHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  languageChipRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  chipList: {
    flexDirection: "row",
    flexWrap: "wrap",
    flex: 1,
  },
  languageChip: {
    marginRight: 8,
    marginBottom: 4,
  },
  sortButton: {
    padding: 8,
  },
  createStudioButtonContainer: {
    paddingHorizontal: 16,
    marginTop: 32,
    marginBottom: 32,
  },
});
