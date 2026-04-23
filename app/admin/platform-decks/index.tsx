import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { listPlatformDeckDrafts } from "@/lib/api/platformDecks";
import type {
  PlatformDeckDraftResponse,
  PlatformDeckDraftStatus,
} from "@/types/platformDeck";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

const STATUS_META: Record<
  PlatformDeckDraftStatus,
  { label: string; icon: string }
> = {
  draft: { label: "Draft", icon: "pencil-outline" },
  processing_started: { label: "Publishing", icon: "progress-upload" },
  processing_completed: { label: "Published", icon: "check-circle" },
  failed: { label: "Failed", icon: "alert-circle" },
};

function routeForDraft(draft: PlatformDeckDraftResponse): string {
  if (draft.status === "draft") return `/admin/platform-decks/${draft.id}/edit`;
  if (draft.status === "processing_completed")
    return `/admin/platform-decks/${draft.id}/collections`;
  return `/admin/platform-decks/${draft.id}/publish`;
}

export default function PlatformDecksLandingScreen() {
  const theme = useTheme();
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ["platformDecks", "drafts", "all"],
    queryFn: () => listPlatformDeckDrafts({ pageSize: 50 }),
  });

  if (isLoading) return <LoadingSpinner message="Loading decks..." />;

  const drafts = data?.data ?? [];
  const inFlight = drafts.filter((d) => d.status !== "processing_completed");
  const published = drafts.filter(
    (d) => d.status === "processing_completed"
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text variant="headlineSmall">Platform decks</Text>
        <Button
          title="New platform deck"
          onPress={() => router.push("/admin/platform-decks/new")}
          icon="plus"
        />
      </View>

      {error && (
        <Card>
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            Failed to load drafts: {(error as Error).message}
          </Text>
        </Card>
      )}

      <Section title="In-flight">
        {inFlight.length === 0 ? (
          <EmptyRow text="No drafts in flight." />
        ) : (
          inFlight.map((d) => (
            <DraftRow
              key={d.id}
              draft={d}
              onPress={() => router.push(routeForDraft(d))}
            />
          ))
        )}
      </Section>

      <Section title="Recently published">
        {published.length === 0 ? (
          <EmptyRow text="Nothing published yet." />
        ) : (
          published.map((d) => (
            <DraftRow
              key={d.id}
              draft={d}
              onPress={() => router.push(routeForDraft(d))}
            />
          ))
        )}
      </Section>
    </ScrollView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text
        variant="titleSmall"
        style={{ color: theme.colors.onSurfaceVariant }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function DraftRow({
  draft,
  onPress,
}: {
  draft: PlatformDeckDraftResponse;
  onPress: () => void;
}) {
  const theme = useTheme();
  const meta = STATUS_META[draft.status];
  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" numberOfLines={1}>
              {draft.title || "Untitled"}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {draft.level} · {draft.langVariantId}
              {draft.forKids ? " · kids" : ""}
            </Text>
          </View>
          <View style={styles.statusCell}>
            <MaterialCommunityIcons
              name={meta.icon as never}
              size={18}
              color={
                draft.status === "failed"
                  ? theme.colors.error
                  : draft.status === "processing_completed"
                    ? theme.colors.primary
                    : theme.colors.onSurfaceVariant
              }
            />
            <Text
              variant="labelSmall"
              style={{
                color:
                  draft.status === "failed"
                    ? theme.colors.error
                    : theme.colors.onSurfaceVariant,
              }}
            >
              {meta.label}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

function EmptyRow({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <Card>
      <Text
        variant="bodySmall"
        style={{ color: theme.colors.onSurfaceVariant }}
      >
        {text}
      </Text>
    </Card>
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
  section: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusCell: {
    alignItems: "center",
    gap: 2,
  },
});
