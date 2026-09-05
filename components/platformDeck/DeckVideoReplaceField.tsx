import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";

import { VideoPickerField } from "@/components/submission/VideoPickerField";
import { Button } from "@/components/ui/Button";
import {
  cancelPlatformDeckVideoReplacement,
  getPlatformDeckVideoStatus,
  replacePlatformDeckVideo,
} from "@/lib/api/decks";
import { getMimeType, uploadFileToStorage } from "@/lib/storage";
import {
  FILE_LIMITS,
  MAX_VIDEO_DIMENSIONS,
  MAX_VIDEO_DURATION_MS,
  MIN_VIDEO_DIMENSIONS,
  MIN_VIDEO_DURATION_MS,
  validateVideoMedia,
} from "@/lib/uploadValidation";
import type { PlatformDeckVideoStatus } from "@/types/deck";
import type { MediaUpload } from "@/types/submission";

type DeckVideoReplaceFieldProps = {
  deckId: string;
  /** From the deck read; the status endpoint's answer overrides it once loaded. */
  hasVideo: boolean;
  /** Poster frame of the live video, shown as the proof that one exists. */
  firstVideoFrameUrl: string | null;
  buildGcsPath: (filename: string) => string;
  /** The new video is live. The parent refetches the deck — hasVideo and the
   *  poster frame have changed under it. */
  onReplaced: () => void;
  onError: (message: string) => void;
};

const POLL_MS = 3000;
const SLOW_WARN_MS = 10 * 60 * 1000;

/**
 * Adds or replaces the video of an already-published deck.
 *
 * Deliberately not part of the form's stage-then-save flow the covers and
 * audio use: video has to go through the transcoder, so the API exposes it as
 * its own job (POST /admin/decks/:id/video) rather than a field on the deck
 * PATCH, and "Save changes" would have nothing to carry. So this field owns
 * the whole round trip — pick, validate, upload to the staging slot, start
 * the replacement, poll it — and only reports the outcome upward.
 *
 * The deck keeps its current video until the new one is transcoded and
 * verified, so a failed attempt costs nothing but time; that is also why
 * there is no confirmation step beyond the explicit start button.
 */
export function DeckVideoReplaceField({
  deckId,
  hasVideo,
  firstVideoFrameUrl,
  buildGcsPath,
  onReplaced,
  onError,
}: DeckVideoReplaceFieldProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [media, setMedia] = useState<MediaUpload | null>(null);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [slowHint, setSlowHint] = useState(false);

  const statusKey = ["platformDeckVideo", deckId];
  // Always fetched once: the deck payload says nothing about a replacement
  // that may still be running from an earlier visit, and the version number
  // is worth showing. Polls only while one is in flight.
  const {
    data: status,
    error: statusError,
    refetch,
  } = useQuery<PlatformDeckVideoStatus>({
    queryKey: statusKey,
    queryFn: () => getPlatformDeckVideoStatus(deckId),
    refetchInterval: (q) =>
      q.state.data?.replacement?.status === "processing" ? POLL_MS : false,
    // Transcoding takes minutes; an admin who switches tabs meanwhile would
    // otherwise come back to a spinner frozen at the moment they left.
    refetchIntervalInBackground: true,
  });

  const replacement = status?.replacement ?? null;
  const processing = replacement?.status === "processing";

  // Report the outcome of an attempt we watched run. An attempt that had
  // already finished before this page opened is history, not news — it is
  // shown inline below rather than announced.
  const watched = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!replacement) return;
    if (replacement.status === "processing") {
      watched.current.add(replacement.id);
      return;
    }
    if (!watched.current.delete(replacement.id)) return;
    if (replacement.status === "completed") {
      onReplaced();
    } else if (replacement.status === "failed") {
      onError(
        `Video replacement failed${
          replacement.errorCode ? ` (${replacement.errorCode})` : ""
        }. The deck's previous video is unchanged.`
      );
    }
    // Keyed on the attempt, not on onReplaced/onError: those are inline
    // callbacks on the parent, and re-running on their identity would
    // re-announce the same outcome on every render.
  }, [replacement?.id, replacement?.status]);

  useEffect(() => {
    if (!processing || !replacement) {
      setSlowHint(false);
      return;
    }
    const startedAt = new Date(replacement.createdAt).getTime();
    const check = () => setSlowHint(Date.now() - startedAt > SLOW_WARN_MS);
    check();
    const t = setInterval(check, 10_000);
    return () => clearInterval(t);
  }, [processing, replacement]);

  const handlePicked = async (
    uri: string,
    fileName: string,
    fileSize: number | null,
    mimeType: string | null,
    width: number | null,
    height: number | null,
    durationMs: number | null
  ) => {
    const error = validateVideoMedia({
      fileSize,
      mimeType,
      fileName,
      width,
      height,
      durationMs,
    });
    if (error) {
      setMedia({
        uri: "",
        gcsPath: null,
        fileName,
        progress: 0,
        isUploading: false,
        error,
      });
      return;
    }

    const gcsPath = buildGcsPath(fileName);
    const pending = (progress: number): MediaUpload => ({
      uri,
      gcsPath: null,
      fileName,
      progress,
      isUploading: true,
      error: null,
    });
    setMedia(pending(0));

    try {
      await uploadFileToStorage({
        localUri: uri,
        gcsPath,
        contentType: mimeType || getMimeType(fileName),
        onProgress: (progress) => setMedia(pending(progress)),
      });
      setMedia({
        uri,
        gcsPath,
        fileName,
        progress: 1,
        isUploading: false,
        error: null,
      });
    } catch {
      setMedia({
        uri,
        gcsPath: null,
        fileName,
        progress: 0,
        isUploading: false,
        error: "Upload failed",
      });
    }
  };

  const handleStart = async () => {
    if (!media?.gcsPath) return;
    setStarting(true);
    try {
      const started = await replacePlatformDeckVideo(deckId, media.gcsPath);
      setMedia(null);
      // Seed the status so polling starts on the next tick rather than after
      // a round trip, then refetch for the server's own view.
      queryClient.setQueryData<PlatformDeckVideoStatus>(statusKey, (prev) =>
        prev ? { ...prev, replacement: started } : prev
      );
      await refetch();
    } catch (err) {
      onError(describeReplaceError(err));
    } finally {
      setStarting(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelPlatformDeckVideoReplacement(deckId);
      await refetch();
    } catch (err) {
      onError(
        (err as Error).message || "Failed to cancel the video replacement"
      );
    } finally {
      setCancelling(false);
    }
  };

  const deckHasVideo = status?.hasVideo ?? hasVideo;
  const posterUrl = status?.firstVideoFrameUrl ?? firstVideoFrameUrl;
  const lastFailed =
    replacement?.status === "failed" && !media ? replacement : null;

  return (
    <View style={styles.container}>
      {/* The video itself is only reachable through a signed CDN manifest, so
          the poster frame stands in for it: it is what a learner sees before
          pressing play, and it is the one visual proof a video exists. The
          rendition version is deliberately not shown — it is an internal
          counter that bumps on every replacement and reads as a question. */}
      {deckHasVideo ? (
        <View style={styles.row}>
          {posterUrl && (
            <Image
              source={{ uri: posterUrl }}
              style={styles.poster}
              resizeMode="cover"
              accessibilityLabel="Poster frame of the live video"
            />
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="bodyMedium">This deck has a live video.</Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Learners see it in the app now. Uploading another one replaces it;
              the current video stays live until the new one is ready.
            </Text>
          </View>
        </View>
      ) : (
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          No video — this deck is audio-only.
        </Text>
      )}

      {processing ? (
        <>
          <View style={styles.row}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text variant="bodyMedium" style={{ flex: 1 }}>
              Transcoding the new video…
            </Text>
          </View>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Usually a few minutes.{" "}
            {deckHasVideo
              ? "The deck keeps its current video until the new one is ready."
              : "The deck stays audio-only until it is ready."}{" "}
            Feel free to navigate away — it finishes on its own.
          </Text>
          {slowHint && (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Taking longer than expected. If it never finishes, cancel and try
              again — the deck is untouched either way.
            </Text>
          )}
          <Button
            title="Cancel replacement"
            variant="outline"
            onPress={handleCancel}
            loading={cancelling}
            disabled={cancelling}
          />
        </>
      ) : (
        <>
          {lastFailed && (
            <Text variant="bodySmall" style={{ color: theme.colors.error }}>
              The last replacement failed
              {lastFailed.errorCode ? ` (${lastFailed.errorCode})` : ""}. The
              deck&apos;s video is unchanged; choose a file to try again.
            </Text>
          )}
          <VideoPickerField
            media={media}
            label={null}
            onVideoPicked={handlePicked}
            onRemove={() => setMedia(null)}
          />
          {media?.gcsPath && (
            <Button
              title={deckHasVideo ? "Replace video" : "Add video"}
              icon="video-plus"
              onPress={handleStart}
              loading={starting}
              disabled={starting}
            />
          )}
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            9:16 vertical, {MIN_VIDEO_DIMENSIONS.width}x
            {MIN_VIDEO_DIMENSIONS.height} to {MAX_VIDEO_DIMENSIONS.width}x
            {MAX_VIDEO_DIMENSIONS.height}, {MIN_VIDEO_DURATION_MS / 1000}{" "}
            seconds to {MAX_VIDEO_DURATION_MS / 1000 / 60} minutes,{" "}
            {FILE_LIMITS.video.allowedExtensions.join("/").toUpperCase()}, max{" "}
            {FILE_LIMITS.video.maxBytes / 1024 / 1024} MB. The poster frame is
            extracted from the new video.
          </Text>
        </>
      )}

      {statusError && (
        <Text variant="bodySmall" style={{ color: theme.colors.error }}>
          Couldn&apos;t read the video status: {(statusError as Error).message}
        </Text>
      )}
    </View>
  );
}

/**
 * The API answers with a bare code in `message`; say what it means. Anything
 * unrecognised is passed through — it is still the best clue there is.
 */
function describeReplaceError(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  switch (message) {
    case "VIDEO_REPLACEMENT_IN_PROGRESS":
      return "A video replacement is already running for this deck. Wait for it to finish or cancel it.";
    case "DECK_PUBLISH_IN_PROGRESS":
      return "This deck is still being published. Try again once that has finished.";
    case "VIDEO_NOT_FOUND":
      return "The uploaded video could not be found in storage. Upload it again.";
    case "VIDEO_SOURCE_PATH_NOT_ALLOWED":
      return "The video was staged outside your own upload area. Upload it again.";
    default:
      return message || "Failed to start the video replacement";
  }
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  poster: {
    width: 72,
    height: 128,
    borderRadius: 6,
    backgroundColor: "#000",
  },
});
