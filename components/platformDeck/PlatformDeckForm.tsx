import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { IconButton, Switch, Text, useTheme } from "react-native-paper";

import { GameImageUploadField } from "@/components/game/GameImageUploadField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import {
  StyledSnackbar,
  type SnackbarState,
} from "@/components/ui/StyledSnackbar";
import { useAuth } from "@/contexts/AuthContext";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { getPlatformDeck, updatePlatformDeck } from "@/lib/api/decks";
import { DECK_LEVELS } from "@/lib/constants";
import {
  platformDeckCoverImagePath,
  platformDeckFirstFramePath,
  storagePath,
} from "@/lib/storage";
import type { DeckLevel } from "@/types/langs";

type PlatformDeckFormProps = {
  deckId: string;
};

type DeckFields = {
  title: string;
  level: DeckLevel;
  forKids: boolean;
  url: string;
  spotify: string;
  appleMusic: string;
  amazonMusic: string;
  youtubeMusic: string;
};

const LEVEL_OPTIONS = DECK_LEVELS.map((level) => ({
  label: level,
  value: level,
}));

export function PlatformDeckForm({ deckId }: PlatformDeckFormProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [snackbar, setSnackbar] = useState<SnackbarState>(null);
  const [fields, setFields] = useState<DeckFields | null>(null);
  const [pendingHorizontalPath, setPendingHorizontalPath] = useState<
    string | null
  >(null);
  const [pendingVerticalPath, setPendingVerticalPath] = useState<string | null>(
    null
  );
  const [pendingFirstFramePath, setPendingFirstFramePath] = useState<
    string | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [playingCardId, setPlayingCardId] = useState<string | null>(null);

  const audioPlayer = useAudioPlayer();

  const {
    data: deck,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["adminPlatformDeck", deckId],
    queryFn: () => getPlatformDeck(deckId),
  });

  useEffect(() => {
    if (!deck || fields !== null) return;
    setFields({
      title: deck.title,
      level: deck.level,
      forKids: deck.forKids,
      url: deck.url ?? "",
      spotify: deck.spotify ?? "",
      appleMusic: deck.appleMusic ?? "",
      amazonMusic: deck.amazonMusic ?? "",
      youtubeMusic: deck.youtubeMusic ?? "",
    });
  }, [deck, fields]);

  useEffect(() => {
    audioPlayer.onComplete.current = () => setPlayingCardId(null);
    return () => {
      audioPlayer.onComplete.current = null;
    };
  }, [audioPlayer.onComplete]);

  // Replacement covers are staged like draft images: to the mates bucket under
  // the platformDeckDrafts prefix (with the deck id in the draft-id slot), then
  // the API copies them to the CDN on save.
  const uploadBasePath = user
    ? storagePath("platformDeckDrafts", user.uid, deckId)
    : null;

  const setField = <K extends keyof DeckFields>(
    key: K,
    value: DeckFields[K]
  ) => {
    setFields((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handlePlayCard = async (cardId: string, audioUrl: string) => {
    if (playingCardId === cardId) {
      await audioPlayer.stop();
      setPlayingCardId(null);
      return;
    }
    await audioPlayer.stop();
    setPlayingCardId(cardId);
    await audioPlayer.play(audioUrl);
  };

  const handleSave = async () => {
    if (!fields) return;
    if (!fields.title.trim()) {
      setSnackbar({ message: "Title is required", type: "error" });
      return;
    }

    setSaving(true);
    try {
      await updatePlatformDeck(deckId, {
        title: fields.title.trim(),
        level: fields.level,
        forKids: fields.forKids,
        url: fields.url.trim(),
        spotify: fields.spotify.trim(),
        appleMusic: fields.appleMusic.trim(),
        amazonMusic: fields.amazonMusic.trim(),
        youtubeMusic: fields.youtubeMusic.trim(),
        ...(pendingHorizontalPath
          ? { horizontalImageSourcePath: pendingHorizontalPath }
          : {}),
        ...(pendingVerticalPath
          ? { verticalImageSourcePath: pendingVerticalPath }
          : {}),
        ...(pendingFirstFramePath
          ? { firstVideoFrameSourcePath: pendingFirstFramePath }
          : {}),
      });
      // Replaced images now live at new CDN URLs; drop the staged paths so a
      // later save doesn't re-copy them.
      setPendingHorizontalPath(null);
      setPendingVerticalPath(null);
      setPendingFirstFramePath(null);
      queryClient.invalidateQueries({
        queryKey: ["adminPlatformDeck", deckId],
      });
      queryClient.invalidateQueries({ queryKey: ["collection"] });
      setSnackbar({ message: "Deck saved", type: "success" });
    } catch (err) {
      setSnackbar({
        message: (err as Error).message || "Failed to save deck",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || (deck && fields === null)) {
    return (
      <>
        <Stack.Screen options={{ title: deck?.title || "Edit deck" }} />
        <LoadingSpinner message="Loading deck..." />
      </>
    );
  }

  if (!deck || !fields) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Stack.Screen options={{ title: "Edit deck" }} />
        <Card style={styles.card}>
          <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
            {(error as Error)?.message ?? "Failed to load deck."}
          </Text>
          <Button
            title="Retry"
            onPress={() => refetch()}
            style={styles.topSpacing}
          />
        </Card>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Stack.Screen options={{ title: deck.title || "Edit deck" }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Card style={styles.card}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Deck
          </Text>
          <Input
            label="Title"
            value={fields.title}
            onChangeText={(text) => setField("title", text)}
            maxLength={200}
          />
          <Select
            label="Level"
            options={LEVEL_OPTIONS}
            value={fields.level}
            onValueChange={(value) => setField("level", value as DeckLevel)}
          />
          <View style={styles.switchRow}>
            <Text variant="bodyMedium">For kids</Text>
            <Switch
              value={fields.forKids}
              onValueChange={(value) => setField("forKids", value)}
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Covers
          </Text>
          {uploadBasePath && (
            <>
              <GameImageUploadField
                label="Horizontal cover (1920x1080)"
                aspectRatio={[16, 9]}
                resizeVariant="horizontal"
                existingPath={pendingHorizontalPath}
                existingUrl={deck.horizontalImageUrl}
                buildGcsPath={(filename) =>
                  platformDeckCoverImagePath(
                    uploadBasePath,
                    "horizontal",
                    filename
                  )
                }
                onUploaded={(gcsPath) => setPendingHorizontalPath(gcsPath)}
                onRemove={() => setPendingHorizontalPath(null)}
              />
              <View style={styles.imageSpacer} />
              <GameImageUploadField
                label="Vertical cover (1080x1920)"
                aspectRatio={[9, 16]}
                resizeVariant="vertical"
                existingPath={pendingVerticalPath}
                existingUrl={deck.verticalImageUrl}
                buildGcsPath={(filename) =>
                  platformDeckCoverImagePath(
                    uploadBasePath,
                    "vertical",
                    filename
                  )
                }
                onUploaded={(gcsPath) => setPendingVerticalPath(gcsPath)}
                onRemove={() => setPendingVerticalPath(null)}
              />
              {/* The poster frame is only meaningful for a deck with a video —
                  it's normally extracted from the video on publish. */}
              {deck.previewVideoUrl && (
                <>
                  <View style={styles.imageSpacer} />
                  <GameImageUploadField
                    label="Video poster frame (1080x1920)"
                    aspectRatio={[9, 16]}
                    resizeVariant="vertical"
                    existingPath={pendingFirstFramePath}
                    existingUrl={deck.firstVideoFrameUrl}
                    buildGcsPath={(filename) =>
                      platformDeckFirstFramePath(uploadBasePath, filename)
                    }
                    onUploaded={(gcsPath) => setPendingFirstFramePath(gcsPath)}
                    onRemove={() => setPendingFirstFramePath(null)}
                  />
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    Extracted from the video on publish. Upload one here to
                    override it.
                  </Text>
                </>
              )}
            </>
          )}
        </Card>

        <Card style={styles.card}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Links
          </Text>
          <Input
            label="Website URL"
            value={fields.url}
            onChangeText={(text) => setField("url", text)}
            keyboardType="url"
            autoCapitalize="none"
          />
          <Input
            label="Spotify"
            value={fields.spotify}
            onChangeText={(text) => setField("spotify", text)}
            keyboardType="url"
            autoCapitalize="none"
          />
          <Input
            label="Apple Music"
            value={fields.appleMusic}
            onChangeText={(text) => setField("appleMusic", text)}
            keyboardType="url"
            autoCapitalize="none"
          />
          <Input
            label="Amazon Music"
            value={fields.amazonMusic}
            onChangeText={(text) => setField("amazonMusic", text)}
            keyboardType="url"
            autoCapitalize="none"
          />
          <Input
            label="YouTube Music"
            value={fields.youtubeMusic}
            onChangeText={(text) => setField("youtubeMusic", text)}
            keyboardType="url"
            autoCapitalize="none"
          />
        </Card>

        <Card style={styles.card}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Cards ({deck.cards.length})
          </Text>
          <Text
            variant="bodySmall"
            style={{
              color: theme.colors.onSurfaceVariant,
              marginBottom: 12,
            }}
          >
            Card text and audio are set before publishing and can't be changed
            here — editing them would leave the generated translations stale.
          </Text>
          {deck.cards.map((card) => (
            <View key={card.id} style={styles.cardRow}>
              <Text variant="bodyMedium" style={styles.cardText}>
                {card.text}
              </Text>
              <IconButton
                icon={playingCardId === card.id ? "stop" : "play"}
                size={20}
                onPress={() => handlePlayCard(card.id, card.audioUrl)}
              />
            </View>
          ))}
        </Card>

        <Button
          title="Save changes"
          icon="content-save"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveButton}
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
    paddingBottom: 48,
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  imageSpacer: {
    height: 24,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardText: {
    flex: 1,
  },
  saveButton: {
    marginTop: 8,
  },
  topSpacing: {
    marginTop: 12,
  },
});
