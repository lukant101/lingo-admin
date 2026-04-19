import { CardEditor } from "@/components/submission/CardEditor";
import { ImagePickerField } from "@/components/submission/ImagePickerField";
import { StepIndicator } from "@/components/submission/StepIndicator";
import { VideoPickerField } from "@/components/submission/VideoPickerField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  StyledSnackbar,
  type SnackbarState,
} from "@/components/ui/StyledSnackbar";
import { useAuth } from "@/contexts/AuthContext";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import {
  createSubmission,
  getSubmission,
  submitForReview,
  updateSubmission,
  type CompletedStep,
} from "@/lib/api/submissions";
import { DIALOG_MAX_WIDTH } from "@/lib/constants";
import {
  MIN_COVER_DIMENSIONS,
  resizeForCover,
  type ResizeResult,
} from "@/lib/imageProcessing";
import { consumeRecordingResult } from "@/lib/recordingResult";
import {
  buildAudioPath,
  buildCoverImagePath,
  buildVideoPath,
  findNewestFile,
  getFileDownloadURL,
  getMimeType,
  uploadFileToStorage,
} from "@/lib/storage";
import {
  FILE_LIMITS,
  MAX_AUDIO_DURATION_MS,
  MAX_VIDEO_DIMENSIONS,
  MAX_VIDEO_DURATION_MS,
  MIN_AUDIO_DURATION_MS,
  MIN_VIDEO_DIMENSIONS,
  MIN_VIDEO_DURATION_MS,
  validateFile,
} from "@/lib/uploadValidation";
import type {
  CardDraft,
  CardInput,
  MediaUpload,
  Submission,
} from "@/types/submission";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createAudioPlayer } from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useReducer, useState } from "react";
import {
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Dialog,
  Button as PaperButton,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";

// --- Types ---

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

const STEP_LABELS = ["Title", "Video", "Images", "Audio", "Text", "Submit"];

type SubmissionWizardProps = {
  studioId: string;
  submissionId?: string;
};

// --- Reducer ---

type EditState = {
  title: string;
  cards: CardDraft[];
  coverHorizontal: MediaUpload | null;
  coverVertical: MediaUpload | null;
  video: MediaUpload | null;
  isSaving: boolean;
  isSubmitting: boolean;
  activeCardForRecording: number | null;
  error: string | null;
  currentStep: WizardStep;
  isAudioLocked: boolean;
  reviewCardIndex: number;
  reviewFrontierIndex: number;
};

type EditAction =
  | { type: "SET_TITLE"; title: string }
  | { type: "SET_CARDS"; cards: CardDraft[] }
  | { type: "UPDATE_CARD"; index: number; card: Partial<CardDraft> }
  | { type: "ADD_CARD" }
  | { type: "REMOVE_CARD"; index: number }
  | { type: "SET_COVER_HORIZONTAL"; media: MediaUpload | null }
  | { type: "SET_COVER_VERTICAL"; media: MediaUpload | null }
  | { type: "SET_VIDEO"; media: MediaUpload | null }
  | { type: "SET_SAVING"; isSaving: boolean }
  | { type: "SET_SUBMITTING"; isSubmitting: boolean }
  | { type: "SET_ACTIVE_CARD_FOR_RECORDING"; index: number | null }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_STEP"; step: WizardStep }
  | { type: "SET_AUDIO_LOCKED" }
  | { type: "SET_REVIEW_CARD_INDEX"; index: number }
  | { type: "ADVANCE_FRONTIER" }
  | { type: "INIT"; state: Partial<EditState> };

let nextCardId = 0;

function createEmptyCard(): CardDraft {
  return {
    id: String(nextCardId++),
    text: "",
    audioUri: null,
    audioGcsPath: null,
    uploadProgress: 0,
    isUploading: false,
    error: null,
  };
}

function editReducer(state: EditState, action: EditAction): EditState {
  switch (action.type) {
    case "SET_TITLE":
      return { ...state, title: action.title, error: null };
    case "SET_CARDS":
      return { ...state, cards: action.cards, error: null };
    case "UPDATE_CARD": {
      const cards = [...state.cards];
      cards[action.index] = { ...cards[action.index], ...action.card };
      return { ...state, cards, error: null };
    }
    case "ADD_CARD":
      return {
        ...state,
        cards: [...state.cards, createEmptyCard()],
        error: null,
      };
    case "REMOVE_CARD":
      return {
        ...state,
        cards: state.cards.filter((_, i) => i !== action.index),
        error: null,
      };
    case "SET_COVER_HORIZONTAL":
      return { ...state, coverHorizontal: action.media, error: null };
    case "SET_COVER_VERTICAL":
      return { ...state, coverVertical: action.media, error: null };
    case "SET_VIDEO":
      return { ...state, video: action.media, error: null };
    case "SET_SAVING":
      return { ...state, isSaving: action.isSaving };
    case "SET_SUBMITTING":
      return { ...state, isSubmitting: action.isSubmitting };
    case "SET_ACTIVE_CARD_FOR_RECORDING":
      return { ...state, activeCardForRecording: action.index };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "SET_STEP":
      return { ...state, currentStep: action.step, error: null };
    case "SET_AUDIO_LOCKED":
      return { ...state, isAudioLocked: true };
    case "SET_REVIEW_CARD_INDEX":
      return { ...state, reviewCardIndex: action.index };
    case "ADVANCE_FRONTIER":
      return { ...state, reviewFrontierIndex: state.reviewFrontierIndex + 1 };
    case "INIT":
      return { ...state, ...action.state };
    default:
      return state;
  }
}

function createInitialState(): EditState {
  return {
    title: "",
    cards: [createEmptyCard()],
    coverHorizontal: null,
    coverVertical: null,
    video: null,
    isSaving: false,
    isSubmitting: false,
    activeCardForRecording: null,
    error: null,
    currentStep: 1,
    isAudioLocked: false,
    reviewCardIndex: 0,
    reviewFrontierIndex: 0,
  };
}

// --- Step determination ---

function determineInitialStep(submission: Submission): {
  step: WizardStep;
  audioLocked: boolean;
} {
  const steps = submission.clientCompletedSteps ?? [];

  // Has card_audio but not card_text → waiting for or reviewing transcriptions
  if (steps.includes("card_audio") && !steps.includes("card_text")) {
    return { step: 5, audioLocked: true };
  }

  // Has card_text → ready to submit
  if (steps.includes("card_text")) {
    return { step: 6, audioLocked: true };
  }

  // Fall back to completed-steps inference
  if (!submission.title?.trim()) return { step: 1, audioLocked: false };
  if (!steps.includes("video")) return { step: 2, audioLocked: false };
  if (!steps.includes("images")) return { step: 3, audioLocked: false };
  return { step: 4, audioLocked: false };
}

function getAudioDurationMs(uri: string): Promise<number> {
  return new Promise((resolve) => {
    const player = createAudioPlayer(uri);
    const sub = player.addListener("playbackStatusUpdate", (status) => {
      if (status.isLoaded) {
        sub.remove();
        const ms = Math.round(player.duration * 1000);
        player.remove();
        resolve(ms);
      }
    });
    // Timeout fallback — resolve 0 if loading fails
    setTimeout(() => {
      sub.remove();
      player.remove();
      resolve(0);
    }, 5000);
  });
}

// --- Component ---

export function SubmissionWizard({
  studioId,
  submissionId,
}: SubmissionWizardProps) {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isNew = !submissionId;

  const [state, dispatch] = useReducer(
    editReducer,
    undefined,
    createInitialState
  );
  const [initialized, setInitialized] = useState(isNew);
  const [resolvedId, setResolvedId] = useState<string | null>(
    isNew ? null : (submissionId ?? null)
  );
  const [showAudioLockDialog, setShowAudioLockDialog] = useState(false);
  const audioPlayer = useAudioPlayer();
  const [playingCardIndex, setPlayingCardIndex] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);
  useEffect(() => {
    audioPlayer.onComplete.current = () => setPlayingCardIndex(null);
    return () => {
      audioPlayer.onComplete.current = null;
    };
  }, [audioPlayer.onComplete]);
  const canRecord =
    Platform.OS !== "web" ||
    (typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported("audio/mp4"));

  const { data: submission, isLoading } = useQuery({
    queryKey: ["submission", studioId, resolvedId],
    queryFn: () => getSubmission(studioId!, resolvedId!),
    enabled: !!studioId && !!resolvedId,
    refetchInterval: () => {
      if (
        state.currentStep === 5 &&
        !submission?.transcriptionsProvidedOrDeniedAt
      ) {
        return 3000;
      }
      return false;
    },
  });

  // Initialize state from submission data
  useEffect(() => {
    if (submission && !initialized) {
      const cards: CardDraft[] =
        submission.cardsInput.length > 0
          ? submission.cardsInput.map((c, i) => ({
              id: String(nextCardId++),
              text: c.text || submission.transcriptions?.[i] || "",
              audioUri: null,
              audioGcsPath: c.audio || null,
              uploadProgress: 1,
              isUploading: false,
              error: null,
            }))
          : [createEmptyCard()];

      const { step, audioLocked } = determineInitialStep(submission);

      dispatch({
        type: "INIT",
        state: {
          title: submission.title || "",
          cards,
          currentStep: step,
          isAudioLocked: audioLocked,
          reviewCardIndex: Math.min(
            submission.clientReviewCardIndex ?? 0,
            cards.length - 1
          ),
          reviewFrontierIndex: (submission.clientCompletedSteps ?? []).includes(
            "card_text"
          )
            ? cards.length
            : (submission.clientReviewCardIndex ?? 0),
        },
      });
      setInitialized(true);
    }
  }, [submission, initialized]);

  // Discover media from Cloud Storage based on completed steps
  useEffect(() => {
    if (!initialized || !user || !resolvedId || !submission) return;

    const completedSteps = submission.clientCompletedSteps ?? [];
    const basePath = `studioDeckSubmissions/${user.uid}/${resolvedId}`;
    const errors: string[] = [];

    const discoverMedia = async () => {
      // Resolve card audio URLs
      for (let i = 0; i < state.cards.length; i++) {
        const card = state.cards[i];
        if (!card.audioUri && card.audioGcsPath) {
          const uri = await getFileDownloadURL(card.audioGcsPath);
          dispatch({ type: "UPDATE_CARD", index: i, card: { audioUri: uri } });
        }
      }

      // Discover video from storage
      if (completedSteps.includes("video") && !state.video) {
        const video = await findNewestFile(`${basePath}/video/`);
        if (video) {
          dispatch({
            type: "SET_VIDEO",
            media: {
              uri: video.downloadUrl,
              gcsPath: video.gcsPath,
              fileName: video.gcsPath.split("/").pop() ?? undefined,
              progress: 1,
              isUploading: false,
              error: null,
            },
          });
        } else {
          errors.push("video");
        }
      }

      // Discover cover images from storage
      if (completedSteps.includes("images")) {
        if (!state.coverHorizontal) {
          const horizontal = await findNewestFile(
            `${basePath}/images/`,
            "cover_horizontal_"
          );
          if (horizontal) {
            dispatch({
              type: "SET_COVER_HORIZONTAL",
              media: {
                uri: horizontal.downloadUrl,
                gcsPath: horizontal.gcsPath,
                progress: 1,
                isUploading: false,
                error: null,
              },
            });
          } else {
            errors.push("horizontal cover image");
          }
        }

        if (!state.coverVertical) {
          const vertical = await findNewestFile(
            `${basePath}/images/`,
            "cover_vertical_"
          );
          if (vertical) {
            dispatch({
              type: "SET_COVER_VERTICAL",
              media: {
                uri: vertical.downloadUrl,
                gcsPath: vertical.gcsPath,
                progress: 1,
                isUploading: false,
                error: null,
              },
            });
          } else {
            errors.push("vertical cover image");
          }
        }
      }

      if (errors.length > 0) {
        dispatch({
          type: "SET_ERROR",
          error: `Could not find ${errors.join(", ")} in storage. Please cancel this submission and start over.`,
        });
      }
    };

    discoverMedia();
  }, [initialized]);

  // Sync transcribed text into local state when transcription completes
  useEffect(() => {
    if (!submission || !initialized || state.currentStep !== 5) return;
    if (submission.transcriptionsProvidedOrDeniedAt) {
      const updatedCards = state.cards.map((card, i) => {
        const transcription = submission.transcriptions?.[i];
        if (transcription && !card.text) {
          return { ...card, text: transcription };
        }
        return card;
      });
      dispatch({ type: "SET_CARDS", cards: updatedCards });
      dispatch({ type: "SET_REVIEW_CARD_INDEX", index: 0 });
      dispatch({ type: "INIT", state: { reviewFrontierIndex: 0 } });
    }
  }, [submission?.transcriptionsProvidedOrDeniedAt]);

  const saveCardsInput = async (
    overrideReviewIndex?: number,
    overrideFrontier?: number
  ) => {
    if (!studioId || !resolvedId) return;
    await updateSubmission(studioId, resolvedId, {
      cardsInput: buildCardInputs(),
      clientCompletedSteps: getCompletedSteps(overrideFrontier),
      clientReviewCardIndex: overrideReviewIndex ?? state.reviewCardIndex,
    });
  };

  // Consume recording result when returning from record screen
  useFocusEffect(
    useCallback(() => {
      const result = consumeRecordingResult();
      if (result && state.activeCardForRecording !== null) {
        const cardIndex = state.activeCardForRecording;
        dispatch({ type: "SET_ACTIVE_CARD_FOR_RECORDING", index: null });

        if (result.durationMs < MIN_AUDIO_DURATION_MS) {
          dispatch({
            type: "UPDATE_CARD",
            index: cardIndex,
            card: {
              error: `Audio too short (${(result.durationMs / 1000).toFixed(1)}s). Minimum is ${MIN_AUDIO_DURATION_MS / 1000} seconds.`,
            },
          });
          return;
        }
        if (result.durationMs > MAX_AUDIO_DURATION_MS) {
          dispatch({
            type: "UPDATE_CARD",
            index: cardIndex,
            card: {
              error: `Audio too long (${(result.durationMs / 1000).toFixed(1)}s). Maximum is 10 seconds.`,
            },
          });
          return;
        }

        dispatch({
          type: "UPDATE_CARD",
          index: cardIndex,
          card: { audioUri: result.uri, audioGcsPath: null },
        });
        uploadCardAudio(cardIndex, result.uri, result.filename);
      }
    }, [state.activeCardForRecording])
  );

  // Android hardware back button
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (state.currentStep > 1) {
        dispatch({
          type: "SET_STEP",
          step: (state.currentStep - 1) as WizardStep,
        });
        return true;
      }
      return false; // default behavior
    });

    return () => handler.remove();
  }, [state.currentStep]);

  // --- Upload helpers ---

  const uploadCardAudio = async (
    cardIndex: number,
    uri: string,
    filename: string
  ) => {
    if (!user || !resolvedId) return;

    // Size check as safety net (e.g. for recorded audio where size isn't known upfront)
    if (Platform.OS !== "web") {
      const FileSystem = await import("expo-file-system");
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists && "size" in info) {
        const error = validateFile({
          category: "audio",
          fileSize: info.size,
          mimeType: null,
          fileName: filename,
        });
        if (error) {
          dispatch({ type: "UPDATE_CARD", index: cardIndex, card: { error } });
          return;
        }
      }
    }

    const gcsPath = buildAudioPath(user.uid, resolvedId, cardIndex, filename);

    dispatch({
      type: "UPDATE_CARD",
      index: cardIndex,
      card: { isUploading: true, uploadProgress: 0, error: null },
    });

    try {
      await uploadFileToStorage({
        localUri: uri,
        gcsPath,
        contentType: getMimeType(filename),
        onProgress: (progress) => {
          dispatch({
            type: "UPDATE_CARD",
            index: cardIndex,
            card: { uploadProgress: progress },
          });
        },
      });
      dispatch({
        type: "UPDATE_CARD",
        index: cardIndex,
        card: { audioGcsPath: gcsPath, isUploading: false, uploadProgress: 1 },
      });
      // Persist to backend — build cardsInput directly since state
      // hasn't re-rendered yet with the new gcsPath
      const cardsInput = state.cards
        .map((c, i) => ({
          text: c.text.trim(),
          audio: i === cardIndex ? gcsPath : (c.audioGcsPath ?? ""),
        }))
        .filter((c) => c.audio);
      await updateSubmission(studioId, resolvedId, {
        cardsInput,
        clientCompletedSteps: getCompletedSteps(),
      });
    } catch {
      dispatch({
        type: "UPDATE_CARD",
        index: cardIndex,
        card: { isUploading: false, error: "Upload failed" },
      });
    }
  };

  const handlePickAudio = async (cardIndex: number) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: FILE_LIMITS.audio.allowedMimeTypes,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    const error = validateFile({
      category: "audio",
      fileSize: asset.size ?? null,
      mimeType: asset.mimeType ?? null,
      fileName: asset.name ?? null,
    });
    if (error) {
      dispatch({ type: "UPDATE_CARD", index: cardIndex, card: { error } });
      return;
    }

    const durationMs = await getAudioDurationMs(asset.uri);
    if (durationMs < MIN_AUDIO_DURATION_MS) {
      dispatch({
        type: "UPDATE_CARD",
        index: cardIndex,
        card: {
          error: `Audio too short (${(durationMs / 1000).toFixed(1)}s). Minimum is ${MIN_AUDIO_DURATION_MS / 1000} seconds.`,
        },
      });
      return;
    }
    if (durationMs > MAX_AUDIO_DURATION_MS) {
      dispatch({
        type: "UPDATE_CARD",
        index: cardIndex,
        card: {
          error: `Audio too long (${(durationMs / 1000).toFixed(1)}s). Maximum is 10 seconds.`,
        },
      });
      return;
    }

    dispatch({
      type: "UPDATE_CARD",
      index: cardIndex,
      card: { audioUri: asset.uri, audioGcsPath: null },
    });
    uploadCardAudio(cardIndex, asset.uri, asset.name);
  };

  const handleRecordAudio = (cardIndex: number) => {
    dispatch({ type: "SET_ACTIVE_CARD_FOR_RECORDING", index: cardIndex });
    router.push(`/submission/${studioId}/${resolvedId}/record`);
  };

  const handlePlayAudio = async (cardIndex: number) => {
    const card = state.cards[cardIndex];
    let uri = card.audioUri;
    if (!uri && card.audioGcsPath) {
      uri = await getFileDownloadURL(card.audioGcsPath);
      dispatch({
        type: "UPDATE_CARD",
        index: cardIndex,
        card: { audioUri: uri },
      });
    }
    if (uri) {
      if (playingCardIndex === cardIndex) {
        await audioPlayer.stop();
        setPlayingCardIndex(null);
      } else {
        await audioPlayer.stop();
        setPlayingCardIndex(cardIndex);
        await audioPlayer.play(uri);
      }
    }
  };

  const handleRemoveAudio = (cardIndex: number) => {
    dispatch({
      type: "UPDATE_CARD",
      index: cardIndex,
      card: {
        audioUri: null,
        audioGcsPath: null,
        uploadProgress: 0,
        error: null,
      },
    });
  };

  const uploadCoverImage = async (
    variant: "horizontal" | "vertical",
    uri: string,
    fileSize: number | null,
    mimeType: string | null,
    width: number | null,
    height: number | null
  ) => {
    if (!user || !resolvedId) return;

    const actionType =
      variant === "horizontal" ? "SET_COVER_HORIZONTAL" : "SET_COVER_VERTICAL";
    const error = validateFile({
      category: "image",
      fileSize,
      mimeType,
      fileName: uri.split("/").pop() ?? null,
    });
    if (error) {
      dispatch({
        type: actionType,
        media: {
          uri: "",
          gcsPath: null,
          progress: 0,
          isUploading: false,
          error,
        },
      });
      return;
    }

    // Check minimum dimensions
    const minDims = MIN_COVER_DIMENSIONS[variant];
    if (
      width != null &&
      height != null &&
      (width < minDims.width || height < minDims.height)
    ) {
      dispatch({
        type: actionType,
        media: {
          uri: "",
          gcsPath: null,
          progress: 0,
          isUploading: false,
          error: `Image too small. Minimum resolution is ${minDims.width}x${minDims.height} pixels.`,
        },
      });
      return;
    }

    // Resize/crop to exact cover dimensions
    let resizeResult: ResizeResult;
    try {
      resizeResult = await resizeForCover(
        uri,
        variant,
        width,
        height,
        mimeType
      );
    } catch {
      dispatch({
        type: actionType,
        media: {
          uri: "",
          gcsPath: null,
          progress: 0,
          isUploading: false,
          error: "Failed to resize image",
        },
      });
      return;
    }

    const resizedUri = resizeResult.uri;
    const ext = resizeResult.format === "jpeg" ? "jpg" : resizeResult.format;
    const filename = `cover.${ext}`;
    const gcsPath = buildCoverImagePath(
      user.uid,
      resolvedId,
      variant,
      filename
    );

    dispatch({
      type: actionType,
      media: {
        uri: resizedUri,
        gcsPath: null,
        progress: 0,
        isUploading: true,
        error: null,
      },
    });

    try {
      await uploadFileToStorage({
        localUri: resizedUri,
        gcsPath,
        contentType: `image/${resizeResult.format}`,
        onProgress: (progress) => {
          dispatch({
            type: actionType,
            media: {
              uri: resizedUri,
              gcsPath: null,
              progress,
              isUploading: true,
              error: null,
            },
          });
        },
      });
      dispatch({
        type: actionType,
        media: {
          uri: resizedUri,
          gcsPath,
          progress: 1,
          isUploading: false,
          error: null,
        },
      });
    } catch {
      dispatch({
        type: actionType,
        media: {
          uri: resizedUri,
          gcsPath: null,
          progress: 0,
          isUploading: false,
          error: "Upload failed",
        },
      });
    }
  };

  const uploadVideo = async (
    uri: string,
    fileName: string,
    fileSize: number | null,
    mimeType: string | null,
    width: number | null,
    height: number | null,
    durationMs: number | null
  ) => {
    if (!user || !resolvedId) return;

    const error = validateFile({
      category: "video",
      fileSize,
      mimeType,
      fileName,
    });
    if (error) {
      dispatch({
        type: "SET_VIDEO",
        media: {
          uri: "",
          gcsPath: null,
          fileName,
          progress: 0,
          isUploading: false,
          error,
        },
      });
      return;
    }

    // Check duration (10 seconds – 3 minutes) when available
    if (durationMs != null) {
      if (durationMs < MIN_VIDEO_DURATION_MS) {
        dispatch({
          type: "SET_VIDEO",
          media: {
            uri: "",
            gcsPath: null,
            fileName,
            progress: 0,
            isUploading: false,
            error: `Video too short (${(durationMs / 1000).toFixed(1)}s). Minimum is ${MIN_VIDEO_DURATION_MS / 1000} seconds.`,
          },
        });
        return;
      }
      if (durationMs > MAX_VIDEO_DURATION_MS) {
        dispatch({
          type: "SET_VIDEO",
          media: {
            uri: "",
            gcsPath: null,
            fileName,
            progress: 0,
            isUploading: false,
            error: `Video too long (${(durationMs / 1000).toFixed(0)}s). Maximum is ${MAX_VIDEO_DURATION_MS / 1000 / 60} minutes.`,
          },
        });
        return;
      }
    }

    // Check aspect ratio and resolution (9:16 vertical, HD to Full HD)
    if (width != null && height != null) {
      if (width * 16 !== height * 9) {
        dispatch({
          type: "SET_VIDEO",
          media: {
            uri: "",
            gcsPath: null,
            fileName,
            progress: 0,
            isUploading: false,
            error: `Video must be 9:16 vertical aspect ratio. Got ${width}x${height}.`,
          },
        });
        return;
      }
      if (
        width < MIN_VIDEO_DIMENSIONS.width ||
        height < MIN_VIDEO_DIMENSIONS.height
      ) {
        dispatch({
          type: "SET_VIDEO",
          media: {
            uri: "",
            gcsPath: null,
            fileName,
            progress: 0,
            isUploading: false,
            error: `Video resolution too low (${width}x${height}). Minimum is ${MIN_VIDEO_DIMENSIONS.width}x${MIN_VIDEO_DIMENSIONS.height} pixels.`,
          },
        });
        return;
      }
      if (
        width > MAX_VIDEO_DIMENSIONS.width ||
        height > MAX_VIDEO_DIMENSIONS.height
      ) {
        dispatch({
          type: "SET_VIDEO",
          media: {
            uri: "",
            gcsPath: null,
            fileName,
            progress: 0,
            isUploading: false,
            error: `Video resolution too high (${width}x${height}). Maximum is ${MAX_VIDEO_DIMENSIONS.width}x${MAX_VIDEO_DIMENSIONS.height} pixels.`,
          },
        });
        return;
      }
    }

    const filename = uri.split("/").pop() ?? "video.mp4";
    const gcsPath = buildVideoPath(user.uid, resolvedId, filename);

    dispatch({
      type: "SET_VIDEO",
      media: {
        uri,
        gcsPath: null,
        fileName,
        progress: 0,
        isUploading: true,
        error: null,
      },
    });

    try {
      await uploadFileToStorage({
        localUri: uri,
        gcsPath,
        contentType: mimeType || getMimeType(fileName),
        onProgress: (progress) => {
          dispatch({
            type: "SET_VIDEO",
            media: {
              uri,
              gcsPath: null,
              fileName,
              progress,
              isUploading: true,
              error: null,
            },
          });
        },
      });
      dispatch({
        type: "SET_VIDEO",
        media: {
          uri,
          gcsPath,
          fileName,
          progress: 1,
          isUploading: false,
          error: null,
        },
      });
    } catch {
      dispatch({
        type: "SET_VIDEO",
        media: {
          uri,
          gcsPath: null,
          fileName,
          progress: 0,
          isUploading: false,
          error: "Upload failed",
        },
      });
    }
  };

  // --- Navigation handlers ---

  const buildCardInputs = (): CardInput[] =>
    state.cards
      .filter((c) => c.audioGcsPath)
      .map((c) => ({
        text: c.text.trim(),
        audio: c.audioGcsPath ?? "",
      }));

  const isAnyUploading =
    state.cards.some((c) => c.isUploading) ||
    state.coverHorizontal?.isUploading ||
    state.coverVertical?.isUploading ||
    state.video?.isUploading;

  const canAdvanceStep = (): boolean => {
    switch (state.currentStep) {
      case 1:
        return state.title.trim().length > 0;
      case 2:
        return state.video?.gcsPath != null;
      case 3:
        return (
          state.coverHorizontal?.gcsPath != null &&
          state.coverVertical?.gcsPath != null
        );
      case 4:
        return (
          state.cards.length >= 1 &&
          state.cards.every((c) => c.audioGcsPath != null)
        );
      case 5:
        return (
          !!submission?.transcriptionsProvidedOrDeniedAt &&
          state.reviewFrontierIndex >= state.cards.length &&
          state.cards.every((c) => c.text.trim().length > 0)
        );
      case 6:
        return true;
      default:
        return false;
    }
  };

  const getCompletedSteps = (overrideFrontier?: number): CompletedStep[] => {
    const frontier = overrideFrontier ?? state.reviewFrontierIndex;
    const steps: CompletedStep[] = [];
    if (state.currentStep >= 2 || state.isAudioLocked) steps.push("video");
    if (state.currentStep >= 3 || state.isAudioLocked) steps.push("images");
    if (state.isAudioLocked) steps.push("card_audio");
    if (
      state.currentStep >= 6 ||
      (frontier >= state.cards.length &&
        state.cards.every((c) => c.text.trim().length > 0))
    )
      steps.push("card_text");
    return steps;
  };

  const handleAutoSave = async () => {
    if (!studioId) return;
    dispatch({ type: "SET_SAVING", isSaving: true });
    dispatch({ type: "SET_ERROR", error: null });

    try {
      if (state.currentStep === 1 && !resolvedId) {
        // Create the submission
        const created = await createSubmission(studioId, {
          title: state.title.trim(),
        });
        setResolvedId(created.id);
      } else if (resolvedId) {
        await updateSubmission(studioId, resolvedId, {
          title: state.title.trim(),
          clientCompletedSteps: getCompletedSteps(),
        });
      }
      queryClient.invalidateQueries({
        queryKey: ["submission", studioId, resolvedId],
      });
      queryClient.invalidateQueries({ queryKey: ["submissions", studioId] });
    } finally {
      dispatch({ type: "SET_SAVING", isSaving: false });
    }
  };

  const handleNext = async () => {
    if (!canAdvanceStep()) {
      dispatch({ type: "SET_ERROR", error: getValidationError() });
      return;
    }
    if (isAnyUploading) {
      dispatch({ type: "SET_ERROR", error: "Wait for all uploads to finish" });
      return;
    }

    try {
      if (state.currentStep === 4 && !state.isAudioLocked) {
        setShowAudioLockDialog(true);
        return;
      }

      if (state.currentStep <= 5) {
        await handleAutoSave();
      }

      if (state.currentStep === 4) {
        // Already audio-locked, just advance
        dispatch({ type: "SET_STEP", step: 5 });
      } else if (state.currentStep === 6) {
        // Submit for review
        await handleSubmitForReview();
      } else {
        dispatch({
          type: "SET_STEP",
          step: (state.currentStep + 1) as WizardStep,
        });
      }
    } catch (err) {
      console.error("Wizard step error:", err);
      dispatch({
        type: "SET_ERROR",
        error: "Something went wrong. Please try again.",
      });
    }
  };

  const handleBack = () => {
    if (state.currentStep <= 1) return;
    dispatch({ type: "SET_STEP", step: (state.currentStep - 1) as WizardStep });
  };

  const confirmAudioLock = async () => {
    setShowAudioLockDialog(false);
    dispatch({ type: "SET_AUDIO_LOCKED" });
    // Save with card_audio step directly — dispatch hasn't re-rendered yet
    if (studioId && resolvedId) {
      dispatch({ type: "SET_SAVING", isSaving: true });
      try {
        await updateSubmission(studioId, resolvedId, {
          title: state.title.trim(),
          clientCompletedSteps: ["video", "images", "card_audio"],
        });
        queryClient.invalidateQueries({
          queryKey: ["submission", studioId, resolvedId],
        });
        queryClient.invalidateQueries({ queryKey: ["submissions", studioId] });
      } finally {
        dispatch({ type: "SET_SAVING", isSaving: false });
      }
    }
    dispatch({ type: "SET_STEP", step: 5 });
  };

  const handleSubmitForReview = async () => {
    if (!studioId || !resolvedId) return;

    dispatch({ type: "SET_SUBMITTING", isSubmitting: true });
    dispatch({ type: "SET_ERROR", error: null });

    try {
      await submitForReview(studioId, resolvedId);
      queryClient.invalidateQueries({
        queryKey: ["submission", studioId, resolvedId],
      });
      queryClient.invalidateQueries({ queryKey: ["submissions", studioId] });
      setSnackbar({ message: "Submitted for review!", type: "success" });
      setTimeout(() => router.replace(`/studios/${studioId}`), 1500);
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        error: "Something went wrong while submitting. Please try again.",
      });
      dispatch({ type: "SET_SUBMITTING", isSubmitting: false });
    }
  };

  const getValidationError = (): string => {
    switch (state.currentStep) {
      case 1:
        return "Title is required";
      case 2:
        return "Video is required";
      case 3:
        return "Both cover images are required";
      case 4:
        return "All cards must have audio before continuing";
      case 5:
        if (!submission?.transcriptionsProvidedOrDeniedAt)
          return "Transcriptions must complete before continuing";
        return "All cards must have text before continuing";
      default:
        return "";
    }
  };

  const getNextButtonText = (): string => {
    if (state.currentStep === 6) return "Submit for Review";
    return "Continue";
  };

  const completedSteps = (() => {
    const serverSteps = submission?.clientCompletedSteps ?? [];
    let count = 0;
    if (submission) count = 1;
    if (count === 1 && serverSteps.includes("video")) count = 2;
    if (count === 2 && serverSteps.includes("images")) count = 3;
    if (count === 3 && serverSteps.includes("card_audio")) count = 4;
    if (count === 4 && serverSteps.includes("card_text")) count = 5;
    return count;
  })();

  // --- Render ---

  if (isLoading && !isNew) {
    return <LoadingSpinner message="Loading submission..." />;
  }

  const isNextLoading = state.isSaving || state.isSubmitting;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StepIndicator
        currentStep={state.currentStep}
        completedSteps={completedSteps}
        labels={STEP_LABELS}
      />

      {state.currentStep > 1 && state.title && (
        <Text
          variant="titleMedium"
          style={{
            paddingHorizontal: 16,
            paddingTop: 16,
            color: theme.colors.onSurface,
          }}
          numberOfLines={1}
        >
          {state.title}
        </Text>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step 1 — Title */}
        {state.currentStep === 1 && (
          <Card>
            <Text variant="titleMedium" style={styles.stepTitle}>
              Deck Title
            </Text>
            <Input
              label="Enter a title for your deck"
              value={state.title}
              onChangeText={(text) =>
                dispatch({ type: "SET_TITLE", title: text })
              }
              containerStyle={styles.noMargin}
            />
            <Text
              variant="labelSmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: "right",
                marginTop: 4,
              }}
            >
              {state.title.length}/200
            </Text>
          </Card>
        )}

        {/* Step 2 — Video */}
        {state.currentStep === 2 && (
          <Card>
            <Text variant="titleMedium" style={styles.stepTitle}>
              Video
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              9:16 vertical, 10 seconds to 3 minutes long
            </Text>
            <VideoPickerField
              media={state.video}
              onVideoPicked={uploadVideo}
              onRemove={() => dispatch({ type: "SET_VIDEO", media: null })}
            />
          </Card>
        )}

        {/* Step 3 — Cover Images */}
        {state.currentStep === 3 && (
          <Card>
            <Text variant="titleMedium" style={styles.stepTitle}>
              Cover Images
            </Text>
            <View style={styles.spacer} />
            <ImagePickerField
              label="Horizontal Cover (1920x1080)"
              aspectRatio={[16, 9]}
              media={state.coverHorizontal}
              onImagePicked={(uri, fileSize, mimeType, width, height) =>
                uploadCoverImage(
                  "horizontal",
                  uri,
                  fileSize,
                  mimeType,
                  width,
                  height
                )
              }
              onRemove={() =>
                dispatch({ type: "SET_COVER_HORIZONTAL", media: null })
              }
            />
            <View style={{ height: 24 }} />
            <ImagePickerField
              label="Vertical Cover (1080x1920)"
              aspectRatio={[9, 16]}
              media={state.coverVertical}
              onImagePicked={(uri, fileSize, mimeType, width, height) =>
                uploadCoverImage(
                  "vertical",
                  uri,
                  fileSize,
                  mimeType,
                  width,
                  height
                )
              }
              onRemove={() =>
                dispatch({ type: "SET_COVER_VERTICAL", media: null })
              }
            />
          </Card>
        )}

        {/* Step 4 — Audio Cards */}
        {state.currentStep === 4 && (
          <Card>
            <Text variant="titleMedium" style={styles.stepTitle}>
              Audio Cards ({state.cards.length})
            </Text>
            {state.isAudioLocked ? (
              <View
                style={[
                  styles.infoBanner,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                <MaterialCommunityIcons
                  name="lock"
                  size={16}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}
                >
                  Card audio is locked and cannot be changed.
                </Text>
              </View>
            ) : (
              <View style={{ marginBottom: 12, gap: 4 }}>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  All cards must have audio before continuing.
                </Text>
                {!canRecord && (
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    This browser does not support audio recording. Please upload
                    an audio file instead.
                  </Text>
                )}
              </View>
            )}
            <View style={styles.cardsContainer}>
              {state.cards.map((card, index) => (
                <CardEditor
                  key={card.id}
                  card={card}
                  index={index}
                  showText={false}
                  onTextChange={(text) =>
                    dispatch({ type: "UPDATE_CARD", index, card: { text } })
                  }
                  onPickAudio={() => handlePickAudio(index)}
                  onRecordAudio={
                    canRecord ? () => handleRecordAudio(index) : undefined
                  }
                  onPlayAudio={() => handlePlayAudio(index)}
                  onRemoveAudio={() => handleRemoveAudio(index)}
                  onRemoveCard={() => dispatch({ type: "REMOVE_CARD", index })}
                  isPlaying={playingCardIndex === index}
                  canRemove={state.cards.length > 1}
                  audioLocked={state.isAudioLocked}
                />
              ))}
            </View>
            {!state.isAudioLocked && (
              <Button
                title="Add Card"
                onPress={() => dispatch({ type: "ADD_CARD" })}
                variant="outline"
                style={styles.addCardButton}
              />
            )}
          </Card>
        )}

        {/* Step 5 — Transcription Review */}
        {state.currentStep === 5 && (
          <Card>
            <Text variant="titleMedium" style={styles.stepTitle}>
              Transcription
            </Text>
            {!submission?.transcriptionsProvidedOrDeniedAt ? (
              <View style={styles.statusContainer}>
                <ActivityIndicator size="large" />
                <Text
                  variant="bodyMedium"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    marginTop: 16,
                  }}
                >
                  Transcription in progress...
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                >
                  This may take a few minutes.
                </Text>
              </View>
            ) : (
              <>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <PaperButton
                    compact
                    disabled={state.reviewCardIndex === 0}
                    onPress={() => {
                      const serverText =
                        submission?.cardsInput[state.reviewCardIndex]?.text ??
                        "";
                      if (
                        state.cards[state.reviewCardIndex].text !== serverText
                      ) {
                        dispatch({
                          type: "UPDATE_CARD",
                          index: state.reviewCardIndex,
                          card: { text: serverText },
                        });
                      }
                      dispatch({
                        type: "SET_REVIEW_CARD_INDEX",
                        index: state.reviewCardIndex - 1,
                      });
                    }}
                  >
                    Previous
                  </PaperButton>
                  <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    Card {state.reviewCardIndex + 1} of {state.cards.length}
                  </Text>
                  <PaperButton
                    compact
                    disabled={
                      state.reviewCardIndex >=
                      Math.min(
                        state.reviewFrontierIndex,
                        state.cards.length - 1
                      )
                    }
                    onPress={() => {
                      const serverText =
                        submission?.cardsInput[state.reviewCardIndex]?.text ??
                        "";
                      if (
                        state.cards[state.reviewCardIndex].text !== serverText
                      ) {
                        dispatch({
                          type: "UPDATE_CARD",
                          index: state.reviewCardIndex,
                          card: { text: serverText },
                        });
                      }
                      dispatch({
                        type: "SET_REVIEW_CARD_INDEX",
                        index: state.reviewCardIndex + 1,
                      });
                    }}
                  >
                    Next
                  </PaperButton>
                </View>
                {state.cards[state.reviewCardIndex] && (
                  <CardEditor
                    key={state.cards[state.reviewCardIndex].id}
                    card={state.cards[state.reviewCardIndex]}
                    index={state.reviewCardIndex}
                    showText={true}
                    onTextChange={(text) =>
                      dispatch({
                        type: "UPDATE_CARD",
                        index: state.reviewCardIndex,
                        card: { text },
                      })
                    }
                    onPickAudio={() => {}}
                    onRecordAudio={() => {}}
                    onPlayAudio={() => handlePlayAudio(state.reviewCardIndex)}
                    onRemoveAudio={() => {}}
                    onRemoveCard={() => {}}
                    isPlaying={playingCardIndex === state.reviewCardIndex}
                    canRemove={false}
                    audioLocked={state.isAudioLocked}
                  />
                )}
                {(() => {
                  const isAtFrontier =
                    state.reviewCardIndex === state.reviewFrontierIndex;
                  const isDirty =
                    state.cards[state.reviewCardIndex]?.text !==
                    (submission?.cardsInput[state.reviewCardIndex]?.text ?? "");
                  if (!isDirty && !isAtFrontier) return null;
                  const hasText =
                    (state.cards[state.reviewCardIndex]?.text ?? "").trim()
                      .length > 0;
                  const canAdvance =
                    isAtFrontier &&
                    state.reviewCardIndex < state.cards.length - 1;
                  return (
                    <Button
                      title="Save"
                      loading={state.isSaving}
                      disabled={state.isSaving || !hasText}
                      onPress={async () => {
                        dispatch({ type: "SET_SAVING", isSaving: true });
                        try {
                          if (isAtFrontier) {
                            const newFrontier = state.reviewFrontierIndex + 1;
                            dispatch({ type: "ADVANCE_FRONTIER" });
                            if (canAdvance) {
                              await saveCardsInput(newFrontier, newFrontier);
                              dispatch({
                                type: "SET_REVIEW_CARD_INDEX",
                                index: state.reviewCardIndex + 1,
                              });
                            } else {
                              await saveCardsInput(newFrontier, newFrontier);
                              dispatch({ type: "SET_STEP", step: 6 });
                            }
                          } else {
                            await saveCardsInput(state.reviewFrontierIndex);
                          }
                          queryClient.invalidateQueries({
                            queryKey: ["submission", studioId, resolvedId],
                          });
                          setSnackbar({
                            message: "Card saved",
                            type: "success",
                          });
                        } catch {
                          setSnackbar({
                            message: "Failed to save card",
                            type: "error",
                          });
                        } finally {
                          dispatch({ type: "SET_SAVING", isSaving: false });
                        }
                      }}
                      style={{ marginTop: 12 }}
                    />
                  );
                })()}
              </>
            )}
          </Card>
        )}

        {/* Step 6 — Submit */}
        {state.currentStep === 6 && (
          <Card>
            <Text variant="titleMedium" style={styles.stepTitle}>
              Review & Submit
            </Text>
            <View style={styles.summaryRow}>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Title
              </Text>
              <Text
                variant="bodyMedium"
                numberOfLines={1}
                style={{ flex: 1, textAlign: "right" }}
              >
                {state.title || "Untitled"}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Video
              </Text>
              <MaterialCommunityIcons
                name="check-circle"
                size={20}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.summaryRow}>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Images
              </Text>
              <MaterialCommunityIcons
                name="check-circle"
                size={20}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.summaryRow}>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Cards
              </Text>
              <Text variant="bodyMedium">{state.cards.length}</Text>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Error */}
      {state.error ? (
        <View style={styles.errorContainer}>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.error, textAlign: "center" }}
          >
            {state.error}
          </Text>
        </View>
      ) : null}

      {/* Bottom Navigation Bar */}
      <View
        style={[
          styles.bottomBar,
          { borderTopColor: theme.colors.outlineVariant },
        ]}
      >
        {state.currentStep > 1 ? (
          <Button
            title="Back"
            onPress={handleBack}
            variant="outline"
            disabled={isAnyUploading}
            style={styles.navButton}
          />
        ) : (
          <View style={styles.navButton} />
        )}

        <Button
          title={getNextButtonText()}
          onPress={handleNext}
          loading={isNextLoading}
          disabled={isNextLoading || isAnyUploading}
          style={styles.navButton}
        />
      </View>

      <Portal>
        <Dialog
          visible={showAudioLockDialog}
          onDismiss={() => setShowAudioLockDialog(false)}
          style={{ maxWidth: DIALOG_MAX_WIDTH, alignSelf: "center" }}
        >
          <Dialog.Title>Do you have all the cards?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Once you continue, you won't be able to change the number of cards
              nor the audio.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <PaperButton onPress={() => setShowAudioLockDialog(false)}>
              Cancel
            </PaperButton>
            <PaperButton onPress={confirmAudioLock}>Continue</PaperButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <StyledSnackbar snackbar={snackbar} onDismiss={() => setSnackbar(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 16,
  },
  stepTitle: {
    marginBottom: 12,
  },
  noMargin: {
    marginBottom: 0,
  },
  spacer: {
    height: 8,
  },
  cardsContainer: {
    gap: 12,
  },
  addCardButton: {
    marginTop: 12,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  errorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  navButton: {
    flex: 1,
  },
});
