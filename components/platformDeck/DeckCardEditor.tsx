import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Checkbox,
  IconButton,
  Text,
  useTheme,
} from "react-native-paper";

import {
  CardAudioUploadField,
  type IncomingRecording,
} from "@/components/platformDeck/CardAudioUploadField";
import { DeckAudioUploadField } from "@/components/platformDeck/DeckAudioUploadField";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  getCardTranslationJob,
  retranslateCard,
  updatePlatformDeckCard,
} from "@/lib/api/cards";
import { adminCardAudioPath, platformDeckAudioPath } from "@/lib/storage";
import {
  MAX_DECK_AUDIO_DURATION_MS,
  MIN_DECK_AUDIO_DURATION_MS,
} from "@/lib/uploadValidation";
import type {
  CardTranslationJob,
  PlatformDeckCard,
  PlatformDeckCardUpdateResult,
  UpdatePlatformDeckCardInput,
} from "@/types/deck";

const POLL_MS = 2000;

type DeckCardEditorProps = {
  deckId: string;
  card: PlatformDeckCard;
  /** The deck's current audio track, for the "also re-record" field. */
  deckAudioUrl: string | null;
  /** Mates-bucket staging prefix for this deck's replacement uploads. */
  uploadBasePath: string;
  onSaved: (result: PlatformDeckCardUpdateResult) => void;
  onError: (message: string) => void;
  /** Sends the admin to the record screen; the clip comes back as a prop. */
  onRecord: () => void;
  incomingRecording: IncomingRecording | null;
  onRecordingHandled: () => void;
};

/**
 * One card of a published deck, collapsed to a row until opened.
 *
 * Editing a published card has two consequences that aren't automatic: the
 * generated translations go stale, and — because the deck's audio track is one
 * continuous recording of every card — replacing a clip leaves that track out
 * of step. Neither always applies, so both are choices made here rather than
 * rules applied on save.
 */
export function DeckCardEditor({
  deckId,
  card,
  deckAudioUrl,
  uploadBasePath,
  onSaved,
  onError,
  onRecord,
  incomingRecording,
  onRecordingHandled,
}: DeckCardEditorProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState(card.text);
  const [pendingAudioPath, setPendingAudioPath] = useState<string | null>(null);
  const [pendingDeckAudioPath, setPendingDeckAudioPath] = useState<
    string | null
  >(null);
  const [retranslate, setRetranslate] = useState(false);
  const [retranslateTouched, setRetranslateTouched] = useState(false);
  const [replaceDeckAudio, setReplaceDeckAudio] = useState(false);
  const [saving, setSaving] = useState(false);

  const jobKey = ["cardTranslationJob", deckId, card.id];
  // Only poll a card that has something running. Seeded from the deck read so a
  // reload mid-job picks the polling back up; otherwise no request is made at
  // all, which matters on a deck with a couple of dozen cards.
  const [tracking, setTracking] = useState(
    card.translationJob?.status === "processing"
  );

  const { data: job } = useQuery<CardTranslationJob | null>({
    queryKey: jobKey,
    queryFn: () => getCardTranslationJob(deckId, card.id),
    enabled: tracking,
    initialData: card.translationJob ?? null,
    refetchInterval: (q) =>
      q.state.data?.status === "processing" ? POLL_MS : false,
    // A run across every language takes a while, and an admin who switches tabs
    // meanwhile would otherwise come back to progress frozen at the moment they
    // left — react-query pauses interval refetches for a hidden document.
    refetchIntervalInBackground: true,
  });

  const isTranslating = job?.status === "processing";

  const textChanged = text.trim() !== card.text;
  // Defaults on once the text is dirty and off again if it's reverted, until
  // the admin says otherwise: a typo fix may not be worth ~60 OpenAI calls, and
  // a bad translation may be worth re-running with the text untouched.
  const retranslateChecked = retranslateTouched ? retranslate : textChanged;

  // Ticked but nothing uploaded yet — the admin has said the track is stale, so
  // saving without it would knowingly leave the deck inconsistent.
  const deckAudioMissing = replaceDeckAudio && !pendingDeckAudioPath;

  const hasChanges =
    textChanged ||
    !!pendingAudioPath ||
    !!pendingDeckAudioPath ||
    retranslateChecked;

  const canSave =
    !saving &&
    !isTranslating &&
    hasChanges &&
    !deckAudioMissing &&
    text.trim().length > 0;

  const reset = () => {
    setText(card.text);
    setPendingAudioPath(null);
    setPendingDeckAudioPath(null);
    setRetranslate(false);
    setRetranslateTouched(false);
    setReplaceDeckAudio(false);
  };

  const handleCancel = () => {
    reset();
    setExpanded(false);
  };

  const handleSave = async () => {
    const input: UpdatePlatformDeckCardInput = {};
    if (textChanged) input.text = text.trim();
    if (pendingAudioPath) input.audioSourcePath = pendingAudioPath;
    if (pendingDeckAudioPath) {
      input.deckAudioSourcePath = pendingDeckAudioPath;
    }
    if (retranslateChecked) input.retranslate = true;

    setSaving(true);
    try {
      const result = await updatePlatformDeckCard(deckId, card.id, input);
      queryClient.setQueryData(jobKey, result.translationJob);
      if (result.translationJob?.status === "processing") setTracking(true);
      reset();
      setExpanded(false);
      onSaved(result);
    } catch (err) {
      onError((err as Error).message || "Failed to save card");
    } finally {
      setSaving(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!job?.failedVariantCodes.length) return;
    try {
      const started = await retranslateCard(
        deckId,
        card.id,
        job.failedVariantCodes
      );
      queryClient.setQueryData(jobKey, started);
      setTracking(true);
    } catch (err) {
      onError((err as Error).message || "Failed to start re-translation");
    }
  };

  return (
    <View
      style={[styles.container, { borderColor: theme.colors.outlineVariant }]}
    >
      <View style={styles.header}>
        <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
          {card.position + 1}
        </Text>
        <Text variant="bodyMedium" style={styles.headerText} numberOfLines={2}>
          {card.text}
        </Text>
        {!expanded && (
          <IconButton
            icon="pencil"
            size={18}
            onPress={() => setExpanded(true)}
          />
        )}
      </View>

      <TranslationStatus
        job={job ?? null}
        onRetryFailed={handleRetryFailed}
        disabled={saving}
      />

      {expanded && (
        <View style={styles.body}>
          <Input
            label="Text"
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={3}
            maxLength={1000}
            containerStyle={styles.textInput}
          />

          <CardAudioUploadField
            label="Card audio"
            existingUrl={card.audioUrl}
            buildGcsPath={(filename) =>
              adminCardAudioPath(uploadBasePath, card.position, filename)
            }
            onUploaded={(gcsPath) => {
              setPendingAudioPath(gcsPath);
              // The deck track is a single recording of every card, so a new
              // clip almost always means it needs redoing. Pre-ticked rather
              // than forced — a same-length retake of the same line may not.
              setReplaceDeckAudio(true);
            }}
            onRemove={() => {
              setPendingAudioPath(null);
              setReplaceDeckAudio(false);
            }}
            onRecord={onRecord}
            incomingRecording={incomingRecording}
            onRecordingHandled={onRecordingHandled}
            disabled={saving || isTranslating}
          />

          <Checkbox.Item
            label="Re-translate this card"
            position="leading"
            style={styles.checkbox}
            labelStyle={styles.checkboxLabel}
            status={retranslateChecked ? "checked" : "unchecked"}
            disabled={saving || isTranslating}
            onPress={() => {
              setRetranslateTouched(true);
              setRetranslate(!retranslateChecked);
            }}
          />
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Regenerates this card&apos;s translation in every language the deck
            was published into. Runs in the background.
          </Text>

          <Checkbox.Item
            label="Deck audio also needs re-recording"
            position="leading"
            style={styles.checkbox}
            labelStyle={styles.checkboxLabel}
            status={replaceDeckAudio ? "checked" : "unchecked"}
            disabled={saving || isTranslating}
            onPress={() => {
              const next = !replaceDeckAudio;
              setReplaceDeckAudio(next);
              if (!next) setPendingDeckAudioPath(null);
            }}
          />

          {replaceDeckAudio && (
            <View style={styles.deckAudio}>
              <DeckAudioUploadField
                label="Deck audio (full track)"
                existingUrl={deckAudioUrl}
                buildGcsPath={(filename) =>
                  platformDeckAudioPath(uploadBasePath, filename)
                }
                onUploaded={(gcsPath) => setPendingDeckAudioPath(gcsPath)}
                onRemove={() => setPendingDeckAudioPath(null)}
              />
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {deckAudioMissing
                  ? "Upload the new track to save, or untick the box to save the card on its own."
                  : `${MIN_DECK_AUDIO_DURATION_MS / 1000} seconds to ${MAX_DECK_AUDIO_DURATION_MS / 1000 / 60} minutes, max 60 MB.`}
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <Button
              title="Save card"
              icon="content-save"
              onPress={handleSave}
              loading={saving}
              disabled={!canSave}
              style={styles.action}
            />
            <Button
              title="Cancel"
              variant="outline"
              onPress={handleCancel}
              disabled={saving}
              style={styles.action}
            />
          </View>
        </View>
      )}
    </View>
  );
}

function TranslationStatus({
  job,
  onRetryFailed,
  disabled,
}: {
  job: CardTranslationJob | null;
  onRetryFailed: () => void;
  disabled: boolean;
}) {
  const theme = useTheme();
  if (!job) return null;

  if (job.status === "processing") {
    const progress = job.totalTargets
      ? ` ${job.completedTargets}/${job.totalTargets}`
      : "";
    return (
      <View style={styles.status}>
        <ActivityIndicator size={14} color={theme.colors.primary} />
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          Translating{progress}…
        </Text>
      </View>
    );
  }

  if (job.status === "failed") {
    return (
      <View style={styles.status}>
        <Text variant="bodySmall" style={{ color: theme.colors.error }}>
          Re-translation failed{job.errorCode ? ` (${job.errorCode})` : ""}.
        </Text>
        <Button
          title="Retry"
          variant="outline"
          onPress={onRetryFailed}
          disabled={disabled}
        />
      </View>
    );
  }

  if (job.failedVariantCodes.length > 0) {
    return (
      <View style={styles.status}>
        <Text variant="bodySmall" style={{ color: theme.colors.error }}>
          Translations updated — {job.failedVariantCodes.length} language
          {job.failedVariantCodes.length === 1 ? "" : "s"} failed (
          {job.failedVariantCodes.join(", ")}).
        </Text>
        <Button
          title="Retry failed"
          variant="outline"
          onPress={onRetryFailed}
          disabled={disabled}
        />
      </View>
    );
  }

  return (
    <View style={styles.status}>
      <Text
        variant="bodySmall"
        style={{ color: theme.colors.onSurfaceVariant }}
      >
        Translations updated ({job.completedTargets}{" "}
        {job.completedTargets === 1 ? "language" : "languages"}).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  body: {
    gap: 12,
  },
  textInput: {
    marginBottom: 0,
  },
  checkbox: {
    paddingHorizontal: 0,
  },
  checkboxLabel: {
    textAlign: "left",
  },
  deckAudio: {
    gap: 8,
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  action: {
    flex: 1,
  },
});
