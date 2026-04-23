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
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import {
  getPlatformDeckDraft,
  publishPlatformDeckDraft,
  updatePlatformDeckDraft,
} from "@/lib/api/platformDecks";
import {
  MIN_COVER_DIMENSIONS,
  resizeForCover,
  type ResizeResult,
} from "@/lib/imageProcessing";
import { consumeRecordingResult } from "@/lib/recordingResult";
import {
  adminCardAudioPath,
  adminCoverImagePath,
  adminVideoPath,
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
  PlatformDeckDraftCard,
  PlatformDeckDraftResponse,
} from "@/types/platformDeck";
import type { CardDraft, MediaUpload } from "@/types/submission";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Text, useTheme } from "react-native-paper";

// Step 1 = Collection (set by /new screen, always complete in the wizard)
type WizardStep = 2 | 3 | 4 | 5;

const STEP_LABELS = ["Collection", "Video", "Images", "Cards", "Publish"];
const MAX_CARD_TEXT = 1000;

type PlatformDeckWizardProps = {
  draftId: string;
};

type EditState = {
  title: string;
  cards: CardDraft[];
  coverHorizontal: MediaUpload | null;
  coverVertical: MediaUpload | null;
  video: MediaUpload | null;
  isSaving: boolean;
  isPublishing: boolean;
  activeCardForRecording: number | null;
  error: string | null;
  currentStep: WizardStep;
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
  | { type: "SET_PUBLISHING"; isPublishing: boolean }
  | { type: "SET_ACTIVE_CARD_FOR_RECORDING"; index: number | null }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_STEP"; step: WizardStep }
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
    case "SET_PUBLISHING":
      return { ...state, isPublishing: action.isPublishing };
    case "SET_ACTIVE_CARD_FOR_RECORDING":
      return { ...state, activeCardForRecording: action.index };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "SET_STEP":
      return { ...state, currentStep: action.step, error: null };
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
    isPublishing: false,
    activeCardForRecording: null,
    error: null,
    currentStep: 2,
  };
}

function determineInitialStep(draft: PlatformDeckDraftResponse): WizardStep {
  if (!draft.videoSourcePath) return 2;
  if (!draft.horizontalImageSourcePath || !draft.verticalImageSourcePath)
    return 3;
  const cardsComplete =
    draft.cards.length >= 1 &&
    draft.cards.every((c) => c.audioPath && c.text.trim().length > 0);
  if (!cardsComplete) return 4;
  return 5;
}

function cardsToPayload(cards: CardDraft[]): PlatformDeckDraftCard[] {
  return cards
    .filter((c) => !!c.audioGcsPath)
    .map((c) => ({
      text: c.text.trim(),
      audioPath: c.audioGcsPath ?? "",
    }));
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
    setTimeout(() => {
      sub.remove();
      player.remove();
      resolve(0);
    }, 5000);
  });
}

export function PlatformDeckWizard({ draftId }: PlatformDeckWizardProps) {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [state, dispatch] = useReducer(
    editReducer,
    undefined,
    createInitialState
  );
  const [initialized, setInitialized] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);
  const audioPlayer = useAudioPlayer();
  const [playingCardIndex, setPlayingCardIndex] = useState<number | null>(null);

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

  const { data: draft, isLoading } = useQuery({
    queryKey: ["platformDeck", "draft", draftId],
    queryFn: () => getPlatformDeckDraft(draftId),
  });

  // If the draft isn't in `draft` state, bounce to the publish screen.
  useEffect(() => {
    if (!draft) return;
    if (draft.status !== "draft") {
      router.replace(`/admin/platform-decks/${draftId}/publish`);
    }
  }, [draft, draftId, router]);

  // Hydrate on first load.
  useEffect(() => {
    if (!draft || initialized) return;

    const hydrate = async () => {
      const cards: CardDraft[] =
        draft.cards.length > 0
          ? draft.cards.map((c) => ({
              id: String(nextCardId++),
              text: c.text,
              audioUri: null,
              audioGcsPath: c.audioPath,
              uploadProgress: 1,
              isUploading: false,
              error: null,
            }))
          : [createEmptyCard()];

      const patch: Partial<EditState> = {
        title: draft.title,
        cards,
        currentStep: determineInitialStep(draft),
      };

      if (draft.videoSourcePath) {
        const uri = await getFileDownloadURL(draft.videoSourcePath).catch(
          () => ""
        );
        patch.video = {
          uri,
          gcsPath: draft.videoSourcePath,
          fileName: draft.videoSourcePath.split("/").pop(),
          progress: 1,
          isUploading: false,
          error: null,
        };
      }
      if (draft.horizontalImageSourcePath) {
        const uri = await getFileDownloadURL(
          draft.horizontalImageSourcePath
        ).catch(() => "");
        patch.coverHorizontal = {
          uri,
          gcsPath: draft.horizontalImageSourcePath,
          progress: 1,
          isUploading: false,
          error: null,
        };
      }
      if (draft.verticalImageSourcePath) {
        const uri = await getFileDownloadURL(
          draft.verticalImageSourcePath
        ).catch(() => "");
        patch.coverVertical = {
          uri,
          gcsPath: draft.verticalImageSourcePath,
          progress: 1,
          isUploading: false,
          error: null,
        };
      }

      // Resolve card audio preview URIs
      await Promise.all(
        cards.map(async (card, i) => {
          if (card.audioGcsPath && !card.audioUri) {
            const uri = await getFileDownloadURL(card.audioGcsPath).catch(
              () => ""
            );
            if (uri) {
              patch.cards = patch.cards ?? cards;
              patch.cards[i] = { ...patch.cards[i], audioUri: uri };
            }
          }
        })
      );

      dispatch({ type: "INIT", state: patch });
      setInitialized(true);
    };

    hydrate();
  }, [draft, initialized]);

  // Hardware back on Android steps backwards
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (state.currentStep > 2) {
        dispatch({
          type: "SET_STEP",
          step: (state.currentStep - 1) as WizardStep,
        });
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [state.currentStep]);

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

  // --- PATCH helpers ---

  const patchDraft = async (
    input: Parameters<typeof updatePlatformDeckDraft>[1]
  ) => {
    await updatePlatformDeckDraft(draftId, input);
    queryClient.invalidateQueries({
      queryKey: ["platformDeck", "draft", draftId],
    });
  };

  const patchCards = async (cards: CardDraft[]) => {
    await patchDraft({ cards: cardsToPayload(cards) });
  };

  // --- Upload handlers ---

  const uploadCardAudio = async (
    cardIndex: number,
    uri: string,
    filename: string
  ) => {
    if (!draft) return;

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

    const gcsPath = adminCardAudioPath(
      draft.uploadBasePath,
      cardIndex,
      filename
    );

    const rawMime = getMimeType(filename);
    const audioContentType =
      rawMime === "video/mp4" ? "audio/mp4" : rawMime;

    dispatch({
      type: "UPDATE_CARD",
      index: cardIndex,
      card: { isUploading: true, uploadProgress: 0, error: null },
    });

    try {
      await uploadFileToStorage({
        localUri: uri,
        gcsPath,
        contentType: audioContentType,
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
        card: {
          audioGcsPath: gcsPath,
          isUploading: false,
          uploadProgress: 1,
        },
      });
      const nextCards = state.cards.map((c, i) =>
        i === cardIndex
          ? { ...c, audioGcsPath: gcsPath, audioUri: uri }
          : c
      );
      await patchCards(nextCards);
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
    router.push(`/admin/platform-decks/${draftId}/record`);
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
    if (!uri) return;
    if (playingCardIndex === cardIndex) {
      await audioPlayer.stop();
      setPlayingCardIndex(null);
    } else {
      await audioPlayer.stop();
      setPlayingCardIndex(cardIndex);
      await audioPlayer.play(uri);
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
    if (!draft) return;
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

    let resizeResult: ResizeResult;
    try {
      resizeResult = await resizeForCover(uri, variant, width, height, mimeType);
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
    const gcsPath = adminCoverImagePath(draft.uploadBasePath, variant, filename);

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
      await patchDraft(
        variant === "horizontal"
          ? { horizontalImageSourcePath: gcsPath }
          : { verticalImageSourcePath: gcsPath }
      );
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
    if (!draft) return;

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

    const gcsPath = adminVideoPath(draft.uploadBasePath, fileName);

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
      await patchDraft({ videoSourcePath: gcsPath });
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

  // --- Title save ---

  const handleTitleBlur = async () => {
    if (!draft) return;
    const trimmed = state.title.trim();
    if (!trimmed || trimmed === draft.title) return;
    dispatch({ type: "SET_SAVING", isSaving: true });
    try {
      await patchDraft({ title: trimmed });
    } finally {
      dispatch({ type: "SET_SAVING", isSaving: false });
    }
  };

  const handleCardTextBlur = async (cardIndex: number) => {
    if (!draft) return;
    const card = state.cards[cardIndex];
    if (!card.audioGcsPath) return;
    const serverText = draft.cards[cardIndex]?.text ?? "";
    if (card.text.trim() === serverText) return;
    dispatch({ type: "SET_SAVING", isSaving: true });
    try {
      await patchCards(state.cards);
    } finally {
      dispatch({ type: "SET_SAVING", isSaving: false });
    }
  };

  // --- Publish ---

  const publishMutation = useMutation({
    mutationFn: () => publishPlatformDeckDraft(draftId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["platformDeck", "draft", draftId],
      });
      router.replace(`/admin/platform-decks/${draftId}/publish`);
    },
    onError: (err: Error) => {
      dispatch({
        type: "SET_ERROR",
        error: err.message || "Failed to publish",
      });
    },
  });

  // --- Navigation ---

  const isAnyUploading =
    state.cards.some((c) => c.isUploading) ||
    state.coverHorizontal?.isUploading ||
    state.coverVertical?.isUploading ||
    state.video?.isUploading ||
    false;

  const canAdvanceStep = (): boolean => {
    switch (state.currentStep) {
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
          state.cards.every(
            (c) =>
              c.audioGcsPath != null &&
              c.text.trim().length > 0 &&
              c.text.length <= MAX_CARD_TEXT
          )
        );
      case 5:
        return !!state.title.trim();
      default:
        return false;
    }
  };

  const getValidationError = (): string => {
    switch (state.currentStep) {
      case 2:
        return "Video is required";
      case 3:
        return "Both cover images are required";
      case 4:
        return "Each card needs audio and text (max 1000 chars)";
      case 5:
        return "Title is required";
      default:
        return "";
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
    if (state.currentStep === 5) {
      // Make sure latest card text is persisted before publishing
      dispatch({ type: "SET_PUBLISHING", isPublishing: true });
      try {
        await patchCards(state.cards);
        publishMutation.mutate();
      } finally {
        dispatch({ type: "SET_PUBLISHING", isPublishing: false });
      }
      return;
    }
    dispatch({
      type: "SET_STEP",
      step: (state.currentStep + 1) as WizardStep,
    });
  };

  const handleBack = () => {
    if (state.currentStep <= 2) return;
    dispatch({
      type: "SET_STEP",
      step: (state.currentStep - 1) as WizardStep,
    });
  };

  // --- Render ---

  if (isLoading || !draft || !initialized) {
    return <LoadingSpinner message="Loading draft..." />;
  }

  const completedSteps = (() => {
    let count = 1; // Collection is always done
    if (state.video?.gcsPath) count = 2;
    if (
      count === 2 &&
      state.coverHorizontal?.gcsPath &&
      state.coverVertical?.gcsPath
    )
      count = 3;
    if (
      count === 3 &&
      state.cards.length >= 1 &&
      state.cards.every(
        (c) => c.audioGcsPath && c.text.trim().length > 0
      )
    )
      count = 4;
    return count;
  })();

  const getNextButtonText = () =>
    state.currentStep === 5 ? "Publish" : "Continue";

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StepIndicator
        currentStep={state.currentStep}
        completedSteps={completedSteps}
        labels={STEP_LABELS}
      />

      <View style={styles.deckTitleBar}>
        <Text
          variant="titleMedium"
          numberOfLines={1}
          style={{ color: theme.colors.onSurface }}
        >
          {state.title || "Untitled deck"}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
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
              onImagePicked={(uri, fs, mt, w, h) =>
                uploadCoverImage("horizontal", uri, fs, mt, w, h)
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
              onImagePicked={(uri, fs, mt, w, h) =>
                uploadCoverImage("vertical", uri, fs, mt, w, h)
              }
              onRemove={() =>
                dispatch({ type: "SET_COVER_VERTICAL", media: null })
              }
            />
          </Card>
        )}

        {/* Step 4 — Cards (audio + text together) */}
        {state.currentStep === 4 && (
          <Card>
            <Text variant="titleMedium" style={styles.stepTitle}>
              Cards ({state.cards.length})
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}
            >
              Each card needs an audio clip (0.5–10 seconds) and matching text
              (max {MAX_CARD_TEXT} characters).
            </Text>
            {!canRecord && (
              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 12,
                }}
              >
                This browser does not support audio recording. Upload files
                instead.
              </Text>
            )}
            <View style={styles.cardsContainer}>
              {state.cards.map((card, index) => (
                <CardEditor
                  key={card.id}
                  card={card}
                  index={index}
                  showText
                  onTextChange={(text) =>
                    dispatch({ type: "UPDATE_CARD", index, card: { text } })
                  }
                  onTextBlur={() => handleCardTextBlur(index)}
                  onPickAudio={() => handlePickAudio(index)}
                  onRecordAudio={
                    canRecord ? () => handleRecordAudio(index) : undefined
                  }
                  onPlayAudio={() => handlePlayAudio(index)}
                  onRemoveAudio={() => handleRemoveAudio(index)}
                  onRemoveCard={() => dispatch({ type: "REMOVE_CARD", index })}
                  isPlaying={playingCardIndex === index}
                  canRemove={state.cards.length > 1}
                />
              ))}
            </View>
            <Button
              title="Add Card"
              onPress={() => dispatch({ type: "ADD_CARD" })}
              variant="outline"
              style={styles.addCardButton}
            />
          </Card>
        )}

        {/* Step 5 — Review & Publish */}
        {state.currentStep === 5 && (
          <Card>
            <Text variant="titleMedium" style={styles.stepTitle}>
              Review & Publish
            </Text>
            <Input
              label="Deck title"
              value={state.title}
              onChangeText={(text) => dispatch({ type: "SET_TITLE", title: text })}
              onBlur={handleTitleBlur}
              maxLength={200}
            />
            <View style={styles.summaryRow}>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Video
              </Text>
              <MaterialCommunityIcons
                name={
                  state.video?.gcsPath ? "check-circle" : "alert-circle-outline"
                }
                size={20}
                color={
                  state.video?.gcsPath
                    ? theme.colors.primary
                    : theme.colors.error
                }
              />
            </View>
            <View style={styles.summaryRow}>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Covers
              </Text>
              <MaterialCommunityIcons
                name={
                  state.coverHorizontal?.gcsPath && state.coverVertical?.gcsPath
                    ? "check-circle"
                    : "alert-circle-outline"
                }
                size={20}
                color={
                  state.coverHorizontal?.gcsPath &&
                  state.coverVertical?.gcsPath
                    ? theme.colors.primary
                    : theme.colors.error
                }
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
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                marginTop: 12,
              }}
            >
              Publishing translates cards to every supported language variant
              and kicks off video transcoding. It may take a few minutes.
            </Text>
          </Card>
        )}
      </ScrollView>

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

      <View
        style={[
          styles.bottomBar,
          { borderTopColor: theme.colors.outlineVariant },
        ]}
      >
        {state.currentStep > 2 ? (
          <Button
            title="Back"
            onPress={handleBack}
            variant="outline"
            disabled={isAnyUploading || state.isPublishing}
            style={styles.navButton}
          />
        ) : (
          <View style={styles.navButton} />
        )}
        <Button
          title={getNextButtonText()}
          onPress={handleNext}
          loading={state.isSaving || state.isPublishing}
          disabled={
            state.isSaving || state.isPublishing || isAnyUploading
          }
          style={styles.navButton}
        />
      </View>

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
  deckTitleBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  stepTitle: {
    marginBottom: 12,
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
