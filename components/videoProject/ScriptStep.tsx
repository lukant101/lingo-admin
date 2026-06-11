import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  StyledSnackbar,
  type SnackbarState,
} from "@/components/ui/StyledSnackbar";
import {
  resetVideoProjectChatThreads,
  sendVideoProjectChatMessage,
  updateVideoProject,
} from "@/lib/api/videoProjects";
import type {
  VideoProjectCard,
  VideoProjectChatMessage,
  VideoProjectChatModel,
} from "@/types/videoProject";
import type { VideoProjectStepProps } from "@/components/videoProject/VideoProjectWizard";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Chip, IconButton, Text, useTheme } from "react-native-paper";

const CHAT_MODELS: VideoProjectChatModel[] = ["chatgpt", "gemini", "claude"];

const MODEL_LABELS: Record<VideoProjectChatModel, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  claude: "Claude",
};

const MAX_CARD_TEXT = 1000;

let nextCardId = 0;

function newCardId(): string {
  return `card-${Date.now()}-${nextCardId++}`;
}

/** Split the script into card texts: one non-empty line per card; for
 * dialogue scripts, drop the leading "Speaker:" prefix so TTS won't read it. */
function deriveCardTexts(script: string, kind: "dialogue" | "song"): string[] {
  return script
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) =>
      kind === "dialogue" ? line.replace(/^[^:\n]{1,30}:\s*/, "") : line
    )
    .filter((line) => line.length > 0);
}

export function ScriptStep({ project, refresh }: VideoProjectStepProps) {
  const theme = useTheme();
  const isSong = project.kind === "song";

  const [message, setMessage] = useState("");
  const [targets, setTargets] = useState<VideoProjectChatModel[]>(CHAT_MODELS);
  const [chatErrors, setChatErrors] = useState<
    Partial<Record<VideoProjectChatModel, string>>
  >({});
  const [script, setScript] = useState(project.script ?? "");
  const [cards, setCards] = useState<VideoProjectCard[]>(project.cards);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  const chatMutation = useMutation({
    mutationFn: () =>
      sendVideoProjectChatMessage(project.id, {
        message: message.trim(),
        models: targets,
      }),
    onSuccess: (result) => {
      setChatErrors(result.errors);
      setMessage("");
      refresh();
    },
    onError: (err: Error) => {
      setSnackbar({
        message: err.message || "Failed to send message",
        type: "error",
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => resetVideoProjectChatThreads(project.id),
    onSuccess: () => {
      setChatErrors({});
      refresh();
    },
    onError: (err: Error) => {
      setSnackbar({
        message: err.message || "Failed to clear chats",
        type: "error",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (input: Parameters<typeof updateVideoProject>[1]) =>
      updateVideoProject(project.id, input),
    onSuccess: () => refresh(),
    onError: (err: Error) => {
      setSnackbar({ message: err.message || "Failed to save", type: "error" });
    },
  });

  const toggleTarget = (model: VideoProjectChatModel) => {
    setTargets((current) =>
      current.includes(model)
        ? current.filter((m) => m !== model)
        : [...current, model]
    );
  };

  const handleScriptBlur = () => {
    if (script.trim() === (project.script ?? "").trim()) return;
    saveMutation.mutate({ script });
  };

  const useAsScript = (thread: VideoProjectChatMessage[]) => {
    const lastReply = [...thread].reverse().find((m) => m.role === "assistant");
    if (!lastReply) return;
    setScript(lastReply.content);
    saveMutation.mutate({ script: lastReply.content });
  };

  const handleDeriveCards = () => {
    const texts = deriveCardTexts(script, project.kind);
    if (texts.length === 0) {
      setSnackbar({ message: "The script is empty", type: "error" });
      return;
    }
    const derived: VideoProjectCard[] = texts.map((text) => ({
      id: newCardId(),
      text: text.slice(0, MAX_CARD_TEXT),
      audioPath: null,
    }));
    setCards(derived);
    saveMutation.mutate({ cards: derived });
  };

  const updateCardText = (index: number, text: string) => {
    setCards((current) =>
      current.map((c, i) => (i === index ? { ...c, text } : c))
    );
  };

  const saveCards = (nextCards: VideoProjectCard[]) => {
    saveMutation.mutate({
      cards: nextCards.filter((c) => c.text.trim().length > 0),
    });
  };

  const removeCard = (index: number) => {
    const nextCards = cards.filter((_, i) => i !== index);
    setCards(nextCards);
    saveCards(nextCards);
  };

  const addCard = () => {
    setCards((current) => [
      ...current,
      { id: newCardId(), text: "", audioPath: null },
    ]);
  };

  const canSend =
    message.trim().length > 0 && targets.length > 0 && !chatMutation.isPending;

  return (
    <>
      {/* Chat with the three models */}
      <Card>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Write the {isSong ? "lyrics" : "dialogue"} with AI
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}
        >
          Send the same prompt to ChatGPT, Gemini, and Claude, compare the
          results, and iterate. When one looks right, use it as the script.
        </Text>

        <Input
          label="Prompt"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={3}
          placeholder={
            isSong
              ? "e.g. Write a simple song about ordering coffee, in Spanish, for beginners"
              : "e.g. Write a short dialogue about checking into a hotel, in Spanish, for beginners"
          }
        />
        <View style={styles.chipRow}>
          {CHAT_MODELS.map((model) => (
            <Chip
              key={model}
              selected={targets.includes(model)}
              onPress={() => toggleTarget(model)}
              showSelectedCheck
            >
              {MODEL_LABELS[model]}
            </Chip>
          ))}
        </View>
        <View style={styles.buttonRow}>
          <Button
            title={
              targets.length === CHAT_MODELS.length ? "Send to all" : "Send"
            }
            onPress={() => chatMutation.mutate()}
            loading={chatMutation.isPending}
            disabled={!canSend}
            icon="send"
            style={styles.rowButton}
          />
          <Button
            title="Clear chats"
            onPress={() => resetMutation.mutate()}
            variant="outline"
            disabled={chatMutation.isPending || resetMutation.isPending}
            style={styles.rowButton}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.threadsRow}>
            {CHAT_MODELS.map((model) => (
              <ChatThread
                key={model}
                label={MODEL_LABELS[model]}
                messages={project.chatThreads[model] ?? []}
                error={chatErrors[model]}
                onUseAsScript={() =>
                  useAsScript(project.chatThreads[model] ?? [])
                }
              />
            ))}
          </View>
        </ScrollView>
      </Card>

      {/* Script editor */}
      <Card>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {isSong ? "Lyrics" : "Script"}
        </Text>
        <Input
          value={script}
          onChangeText={setScript}
          onBlur={handleScriptBlur}
          multiline
          numberOfLines={10}
          placeholder={
            isSong
              ? "The final lyrics, one line per card"
              : "The final dialogue, one speaker turn per line (e.g. Anna: ...)"
          }
        />
      </Card>

      {/* Cards derived from the script */}
      <Card>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Cards ({cards.length})
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}
        >
          Each card gets its own audio clip later. Derive them from the script
          (one line per card{isSong ? "" : ", speaker names removed"}), then
          edit as needed.
        </Text>
        <Button
          title="Derive cards from script"
          onPress={handleDeriveCards}
          variant="secondary"
          disabled={!script.trim() || saveMutation.isPending}
          icon="cards-outline"
        />
        <View style={styles.cardsList}>
          {cards.map((card, index) => (
            <View key={card.id} style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Input
                  value={card.text}
                  onChangeText={(text) => updateCardText(index, text)}
                  onBlur={() => saveCards(cards)}
                  maxLength={MAX_CARD_TEXT}
                  placeholder={`Card ${index + 1}`}
                />
              </View>
              <IconButton
                icon="delete-outline"
                onPress={() => removeCard(index)}
                accessibilityLabel={`Remove card ${index + 1}`}
              />
            </View>
          ))}
        </View>
        {cards.length > 0 && (
          <Button title="Add card" onPress={addCard} variant="outline" />
        )}
      </Card>

      <StyledSnackbar snackbar={snackbar} onDismiss={() => setSnackbar(null)} />
    </>
  );
}

function ChatThread({
  label,
  messages,
  error,
  onUseAsScript,
}: {
  label: string;
  messages: VideoProjectChatMessage[];
  error?: string;
  onUseAsScript: () => void;
}) {
  const theme = useTheme();
  const hasReply = messages.some((m) => m.role === "assistant");

  return (
    <View
      style={[
        styles.threadColumn,
        { borderColor: theme.colors.outlineVariant },
      ]}
    >
      <Text variant="titleSmall" style={styles.threadTitle}>
        {label}
      </Text>
      <ScrollView style={styles.threadMessages} nestedScrollEnabled>
        {messages.length === 0 ? (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            No messages yet.
          </Text>
        ) : (
          messages.map((m, i) => (
            <View
              key={i}
              style={[
                styles.messageBubble,
                {
                  backgroundColor:
                    m.role === "user"
                      ? theme.colors.secondaryContainer
                      : theme.colors.surfaceVariant,
                },
              ]}
            >
              <Text variant="bodySmall" selectable>
                {m.content}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
      {error && (
        <Text variant="bodySmall" style={{ color: theme.colors.error }}>
          {error}
        </Text>
      )}
      {hasReply && (
        <Button
          title="Use as script"
          onPress={onUseAsScript}
          variant="secondary"
          icon="arrow-down-bold"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  rowButton: {
    flex: 1,
  },
  threadsRow: {
    flexDirection: "row",
    gap: 12,
  },
  threadColumn: {
    width: 320,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  threadTitle: {
    textAlign: "center",
  },
  threadMessages: {
    maxHeight: 360,
  },
  messageBubble: {
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  cardsList: {
    marginTop: 16,
    gap: 4,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
