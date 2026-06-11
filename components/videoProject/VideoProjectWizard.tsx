import { CardAudioStep } from "@/components/videoProject/CardAudioStep";
import { DeckAudioStep } from "@/components/videoProject/DeckAudioStep";
import { DescribeStep } from "@/components/videoProject/DescribeStep";
import { ExportStep } from "@/components/videoProject/ExportStep";
import { ImagesStep } from "@/components/videoProject/ImagesStep";
import { ScriptStep } from "@/components/videoProject/ScriptStep";
import { SongStep } from "@/components/videoProject/SongStep";
import { StepIndicator } from "@/components/submission/StepIndicator";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getVideoProject } from "@/lib/api/videoProjects";
import type { VideoProjectResponse } from "@/types/videoProject";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

export type VideoProjectStepProps = {
  project: VideoProjectResponse;
  /** Refetch the project after a step mutates it on the server. */
  refresh: () => void;
};

export type VideoProjectStepKey =
  | "script"
  | "images"
  | "cardAudio"
  | "deckAudio"
  | "song"
  | "describe"
  | "export";

type StepDef = {
  key: VideoProjectStepKey;
  label: string;
  isComplete: (project: VideoProjectResponse) => boolean;
};

const SCRIPT_STEP: StepDef = {
  key: "script",
  label: "Script",
  isComplete: (p) => !!p.script?.trim() && p.cards.length > 0,
};

const LYRICS_STEP: StepDef = { ...SCRIPT_STEP, label: "Lyrics" };

const IMAGES_STEP: StepDef = {
  key: "images",
  label: "Images",
  isComplete: (p) => p.images.some((img) => img.status === "approved"),
};

const CARD_AUDIO_STEP: StepDef = {
  key: "cardAudio",
  label: "Card audio",
  isComplete: (p) => p.cards.length > 0 && p.cards.every((c) => !!c.audioPath),
};

const DECK_AUDIO_STEP: StepDef = {
  key: "deckAudio",
  label: "Deck audio",
  isComplete: (p) => !!p.deckAudioPath,
};

const SONG_STEP: StepDef = {
  key: "song",
  label: "Song",
  isComplete: (p) => p.songStatus === "completed" && !!p.songPath,
};

const DESCRIBE_STEP: StepDef = {
  key: "describe",
  label: "Describe",
  isComplete: (p) =>
    !!p.title.trim() && Object.values(p.descriptions).some((d) => !!d?.trim()),
};

const EXPORT_STEP: StepDef = {
  key: "export",
  label: "Export",
  isComplete: () => false,
};

function stepsForProject(project: VideoProjectResponse): StepDef[] {
  return project.kind === "dialogue"
    ? [
        SCRIPT_STEP,
        IMAGES_STEP,
        CARD_AUDIO_STEP,
        DECK_AUDIO_STEP,
        DESCRIBE_STEP,
        EXPORT_STEP,
      ]
    : [
        LYRICS_STEP,
        IMAGES_STEP,
        CARD_AUDIO_STEP,
        SONG_STEP,
        DESCRIBE_STEP,
        EXPORT_STEP,
      ];
}

type VideoProjectWizardProps = {
  projectId: string;
};

export function VideoProjectWizard({ projectId }: VideoProjectWizardProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [stepIndex, setStepIndex] = useState(0);

  const { data: project, isLoading } = useQuery({
    queryKey: ["videoProject", projectId],
    queryFn: () => getVideoProject(projectId),
  });

  if (isLoading || !project) {
    return <LoadingSpinner message="Loading video project..." />;
  }

  const steps = stepsForProject(project);
  const step = steps[stepIndex];
  const completedSteps = (() => {
    let count = 0;
    for (const s of steps) {
      if (!s.isComplete(project)) break;
      count++;
    }
    return count;
  })();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["videoProject", projectId] });
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StepIndicator
        currentStep={stepIndex + 1}
        completedSteps={completedSteps}
        labels={steps.map((s) => s.label)}
      />

      <View style={styles.titleBar}>
        <Text
          variant="titleMedium"
          numberOfLines={1}
          style={{ color: theme.colors.onSurface }}
        >
          {project.title || "Untitled video"}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <StepContent step={step} project={project} refresh={refresh} />
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { borderTopColor: theme.colors.outlineVariant },
        ]}
      >
        {stepIndex > 0 ? (
          <Button
            title="Back"
            onPress={() => setStepIndex(stepIndex - 1)}
            variant="outline"
            style={styles.navButton}
          />
        ) : (
          <View style={styles.navButton} />
        )}
        {stepIndex < steps.length - 1 ? (
          <Button
            title="Continue"
            onPress={() => setStepIndex(stepIndex + 1)}
            style={styles.navButton}
          />
        ) : (
          <View style={styles.navButton} />
        )}
      </View>
    </View>
  );
}

function StepContent({
  step,
  project,
  refresh,
}: VideoProjectStepProps & { step: StepDef }) {
  // Each pipeline step gets its own component; placeholders mark the ones
  // still to be built.
  switch (step.key) {
    case "script":
      return <ScriptStep project={project} refresh={refresh} />;
    case "images":
      return <ImagesStep project={project} refresh={refresh} />;
    case "cardAudio":
      return <CardAudioStep project={project} refresh={refresh} />;
    case "deckAudio":
      return <DeckAudioStep project={project} refresh={refresh} />;
    case "song":
      return <SongStep project={project} refresh={refresh} />;
    case "describe":
      return <DescribeStep project={project} refresh={refresh} />;
    case "export":
      return <ExportStep project={project} refresh={refresh} />;
    default:
      return <PlaceholderStep label={step.label} />;
  }
}

function PlaceholderStep({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <Card>
      <Text variant="titleMedium" style={styles.stepTitle}>
        {label}
      </Text>
      <Text
        variant="bodySmall"
        style={{ color: theme.colors.onSurfaceVariant }}
      >
        This step is not available yet.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
