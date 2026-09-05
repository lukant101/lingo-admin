import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Switch, Text, useTheme } from "react-native-paper";

import { GameImageUploadField } from "@/components/game/GameImageUploadField";
import { CollectionMembershipList } from "@/components/platformDeck/CollectionMembershipList";
import { DeckAudioUploadField } from "@/components/platformDeck/DeckAudioUploadField";
import { DeckCardEditor } from "@/components/platformDeck/DeckCardEditor";
import { DeckVideoReplaceField } from "@/components/platformDeck/DeckVideoReplaceField";
import { TagEditor } from "@/components/platformDeck/TagEditor";
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
import { getPlatformDeck, updatePlatformDeck } from "@/lib/api/decks";
import { DECK_LEVELS } from "@/lib/constants";
import { getVariantName } from "@/lib/languages";
import {
  platformDeckAudioPath,
  platformDeckCoverImagePath,
  platformDeckFirstFramePath,
  platformDeckVideoPath,
  storagePath,
} from "@/lib/storage";
import {
  MAX_DECK_AUDIO_DURATION_MS,
  MIN_DECK_AUDIO_DURATION_MS,
} from "@/lib/uploadValidation";
import type { DeckLevel } from "@/types/langs";

type PlatformDeckFormProps = {
  deckId: string;
};

type DeckFields = {
  title: string;
  level: DeckLevel;
  forKids: boolean;
  tags: string[];
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
  const [pendingAudioPath, setPendingAudioPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      // ?? [] covers an API deployed before tags existed — the web app ships
      // independently of it.
      tags: deck.tags ?? [],
      url: deck.url ?? "",
      spotify: deck.spotify ?? "",
      appleMusic: deck.appleMusic ?? "",
      amazonMusic: deck.amazonMusic ?? "",
      youtubeMusic: deck.youtubeMusic ?? "",
    });
  }, [deck, fields]);

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
        tags: fields.tags,
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
        ...(pendingAudioPath ? { audioSourcePath: pendingAudioPath } : {}),
      });
      // Replaced images now live at new CDN URLs; drop the staged paths so a
      // later save doesn't re-copy them.
      setPendingHorizontalPath(null);
      setPendingVerticalPath(null);
      setPendingFirstFramePath(null);
      setPendingAudioPath(null);
      queryClient.invalidateQueries({
        queryKey: ["adminPlatformDeck", deckId],
      });
      queryClient.invalidateQueries({ queryKey: ["collection"] });
      // A tag invented here should show up as a suggestion on the next deck.
      queryClient.invalidateQueries({ queryKey: ["deckTags"] });
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
          {/* The language variant is fixed at creation and cannot be changed. */}
          <View style={styles.infoRow}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Language
            </Text>
            <Text variant="bodyMedium">
              {getVariantName(deck.langVariantCode)}
            </Text>
          </View>
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
            Tags
          </Text>
          {/* Saved with the rest of the form, not on each chip change — the
              whole set goes up with "Save changes". */}
          <TagEditor
            tags={fields.tags}
            onChange={(tags) => setField("tags", tags)}
            disabled={saving}
          />
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
                  it's normally extracted from the video on publish. Gate on
                  hasVideo, not previewVideoUrl: the platform-deck pipeline
                  serves video via a signed manifest and leaves that URL null. */}
              {deck.hasVideo && (
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
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      marginTop: 8,
                    }}
                  >
                    Extracted from the video when it is published or replaced.
                    Upload one here to override it.
                  </Text>
                </>
              )}
            </>
          )}
        </Card>

        {/* Deck audio and video are independent — a deck can have either, both
            or neither, so both sections show for every deck. */}
        {uploadBasePath && (
          <Card style={styles.card}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Audio
            </Text>
            <DeckAudioUploadField
              label={deck.audioUrl ? "Deck audio" : "Deck audio (none set)"}
              existingUrl={deck.audioUrl}
              buildGcsPath={(filename) =>
                platformDeckAudioPath(uploadBasePath, filename)
              }
              onUploaded={(gcsPath) => setPendingAudioPath(gcsPath)}
              onRemove={() => setPendingAudioPath(null)}
            />
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                marginTop: 8,
              }}
            >
              {MIN_DECK_AUDIO_DURATION_MS / 1000} seconds to{" "}
              {MAX_DECK_AUDIO_DURATION_MS / 1000 / 60} minutes, max 60 MB.
            </Text>
          </Card>
        )}

        {/* Video is not saved with the form: it goes through the transcoder as
            its own job, so the field starts and tracks that itself. Staged in
            the same per-admin slot as the audio — the endpoint accepts no
            other prefix. */}
        {uploadBasePath && (
          <Card style={styles.card}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Video
            </Text>
            <DeckVideoReplaceField
              deckId={deckId}
              // ?? false covers an API deployed before the flag existed.
              hasVideo={deck.hasVideo ?? false}
              firstVideoFrameUrl={deck.firstVideoFrameUrl}
              buildGcsPath={(filename) =>
                platformDeckVideoPath(uploadBasePath, filename)
              }
              onReplaced={() => {
                // hasVideo and the poster frame changed under the form; the
                // seeded fields are left alone since they are keyed on load.
                queryClient.invalidateQueries({
                  queryKey: ["adminPlatformDeck", deckId],
                });
                queryClient.invalidateQueries({ queryKey: ["collection"] });
                setSnackbar({ message: "Video is live", type: "success" });
              }}
              onError={(message) => setSnackbar({ message, type: "error" })}
            />
          </Card>
        )}

        {/* Collection membership carries the learner-visibility gate: a deck in
            collections is hidden unless at least one inclusion is published. */}
        <CollectionMembershipList deckId={deckId} level={fields.level} />

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
            Cards save one at a time, separately from the rest of this form.
            Adding, removing and reordering still has to happen before
            publishing.
          </Text>
          {uploadBasePath &&
            deck.cards.map((card) => (
              <DeckCardEditor
                key={card.id}
                deckId={deckId}
                card={card}
                deckAudioUrl={deck.audioUrl}
                uploadBasePath={uploadBasePath}
                // != null covers both "not in a set" and an API deployed
                // before the field existed.
                deckInVariantSet={deck.variantsSetId != null}
                onSaved={() => {
                  // The save may have replaced the deck's audio track too, so
                  // refetch the deck rather than patching the card in place.
                  queryClient.invalidateQueries({
                    queryKey: ["adminPlatformDeck", deckId],
                  });
                  setSnackbar({ message: "Card saved", type: "success" });
                }}
                onError={(message) => setSnackbar({ message, type: "error" })}
              />
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
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginBottom: 8,
  },
  imageSpacer: {
    height: 24,
  },
  saveButton: {
    marginTop: 8,
  },
  topSpacing: {
    marginTop: 12,
  },
});
