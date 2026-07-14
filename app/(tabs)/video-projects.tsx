import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { listVideoProjects } from "@/lib/api/videoProjects";
import type {
  VideoProjectKind,
  VideoProjectResponse,
} from "@/types/videoProject";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

const KIND_META: Record<VideoProjectKind, { label: string; icon: string }> = {
  dialogue: { label: "Dialogue", icon: "forum-outline" },
  song: { label: "Song", icon: "music-note" },
};

export default function VideoProjectsLandingScreen() {
  const theme = useTheme();
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ["videoProjects", "all"],
    queryFn: () => listVideoProjects({ pageSize: 50 }),
  });

  if (isLoading) return <LoadingSpinner message="Loading video projects..." />;

  const projects = data?.data ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text variant="headlineSmall">Video projects</Text>
        <Button
          title="New video project"
          onPress={() => router.push("/admin/video-projects/new")}
          icon="plus"
        />
      </View>

      {error && (
        <Card>
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            Failed to load video projects: {(error as Error).message}
          </Text>
        </Card>
      )}

      {projects.length === 0 ? (
        <Card>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            No video projects yet. Create one to start producing assets for a
            new video.
          </Text>
        </Card>
      ) : (
        projects.map((p) => (
          <ProjectRow
            key={p.id}
            project={p}
            onPress={() => router.push(`/admin/video-projects/${p.id}/edit`)}
          />
        ))
      )}
    </ScrollView>
  );
}

function ProjectRow({
  project,
  onPress,
}: {
  project: VideoProjectResponse;
  onPress: () => void;
}) {
  const theme = useTheme();
  const meta = KIND_META[project.kind];
  const approvedImages = project.images.filter(
    (img) => img.status === "approved"
  ).length;
  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={styles.row}>
          <MaterialCommunityIcons
            name={meta.icon as never}
            size={24}
            color={theme.colors.primary}
          />
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" numberOfLines={1}>
              {project.title || "Untitled"}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {meta.label} · {project.cards.length} cards · {approvedImages}{" "}
              images
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
