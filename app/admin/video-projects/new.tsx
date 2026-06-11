import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  StyledSnackbar,
  type SnackbarState,
} from "@/components/ui/StyledSnackbar";
import { createVideoProject } from "@/lib/api/videoProjects";
import type { VideoProjectKind } from "@/types/videoProject";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SegmentedButtons, Text, useTheme } from "react-native-paper";

export default function NewVideoProjectScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<VideoProjectKind>("dialogue");
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  const createMutation = useMutation({
    mutationFn: createVideoProject,
    onSuccess: (project) => {
      router.replace(`/admin/video-projects/${project.id}/edit`);
    },
    onError: (err: Error) => {
      setSnackbar({
        message: err.message || "Failed to create video project",
        type: "error",
      });
    },
  });

  const canCreate = title.trim().length > 0 && !createMutation.isPending;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text variant="titleMedium" style={styles.heading}>
            New video project
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}
          >
            A dialogue video gets spoken audio for the whole video; a song video
            gets a generated song. Both get per-card audio clips and
            illustrations.
          </Text>
          <SegmentedButtons
            value={kind}
            onValueChange={(value) => setKind(value as VideoProjectKind)}
            buttons={[
              { value: "dialogue", label: "Dialogue", icon: "forum-outline" },
              { value: "song", label: "Song", icon: "music-note" },
            ]}
            style={styles.kindToggle}
          />
          <Input
            label="Working title"
            value={title}
            onChangeText={setTitle}
            maxLength={200}
          />
          <Text
            variant="labelSmall"
            style={{
              color: theme.colors.onSurfaceVariant,
              textAlign: "right",
            }}
          >
            {title.length}/200
          </Text>
        </Card>

        <Button
          title="Create project"
          onPress={() => createMutation.mutate({ title: title.trim(), kind })}
          loading={createMutation.isPending}
          disabled={!canCreate}
        />
      </ScrollView>
      <StyledSnackbar snackbar={snackbar} onDismiss={() => setSnackbar(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
  heading: {
    marginBottom: 4,
  },
  kindToggle: {
    marginBottom: 16,
  },
});
