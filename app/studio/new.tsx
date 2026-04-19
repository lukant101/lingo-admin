import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  StyledSnackbar,
  type SnackbarState,
} from "@/components/ui/StyledSnackbar";
import { createStudio } from "@/lib/api/studios";
import { DECK_LEVELS } from "@/lib/constants";
import { getVariantName } from "@/lib/languages";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

export default function CreateStudioScreen() {
  const { lang } = useLocalSearchParams<{ lang: string }>();
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<string>(DECK_LEVELS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  const levelOptions = DECK_LEVELS.map((l) => ({ label: l, value: l }));

  const handleCreate = async () => {
    if (!lang) return;

    if (!name.trim()) {
      setSnackbar({ message: "Studio name is required", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        langVariantCode: lang,
        level,
      };
      await createStudio(payload);
      await queryClient.invalidateQueries({ queryKey: ["studios"] });
      setSnackbar({ message: "Studio created successfully", type: "success" });
      setTimeout(() => router.back(), 1500);
    } catch (err) {
      console.error("Failed to create studio:", err);
      setSnackbar({
        message: "Failed to create studio. Please try again.",
        type: "error",
      });
      setSubmitting(false);
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Card style={styles.card}>
          <View style={styles.headerRow}>
            <MaterialCommunityIcons
              name="palette"
              size={24}
              color={theme.colors.primary}
            />
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface, marginLeft: 10 }}
            >
              Create Studio
            </Text>
          </View>

          <Input
            label="Studio Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter studio name"
            maxLength={100}
          />

          <Input
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your studio content"
            multiline
            numberOfLines={4}
            maxLength={600}
          />

          <View style={styles.infoRow}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Language
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurface }}
            >
              {lang ? getVariantName(lang) : "Unknown"}
            </Text>
          </View>

          <Select
            label="Level"
            options={levelOptions}
            value={level}
            onValueChange={setLevel}
          />
        </Card>

        <Button
          title="Submit"
          onPress={handleCreate}
          loading={submitting}
          disabled={!name.trim() || submitting}
          style={styles.createButton}
        />

        <Button
          title="Cancel"
          variant="outline"
          onPress={() => router.back()}
          style={styles.cancelButton}
        />
      </ScrollView>

      <StyledSnackbar snackbar={snackbar} onDismiss={() => setSnackbar(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginBottom: 16,
  },
  createButton: {
    marginTop: 24,
    marginBottom: 16,
  },
  cancelButton: {
    marginTop: 16,
  },
});
