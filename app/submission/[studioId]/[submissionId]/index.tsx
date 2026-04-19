import { StatusBadge } from "@/components/submission/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cancelSubmission, getSubmission } from "@/lib/api/submissions";
import { DIALOG_MAX_WIDTH } from "@/lib/constants";
import type { SubmissionStatus } from "@/types/submission";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Dialog,
  Divider,
  Button as PaperButton,
  Portal,
  Snackbar,
  Text,
  useTheme,
} from "react-native-paper";

const PROCESSING_STATUSES: SubmissionStatus[] = ["submitted", "in_review"];

export default function SubmissionDetailScreen() {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const prevStatusRef = useRef<SubmissionStatus | undefined>(undefined);
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { studioId, submissionId } = useLocalSearchParams<{
    studioId: string;
    submissionId: string;
  }>();

  const {
    data: submission,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["submission", studioId, submissionId],
    queryFn: () => getSubmission(studioId!, submissionId!),
    enabled: !!studioId && !!submissionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && PROCESSING_STATUSES.includes(status)) {
        return 5000;
      }
      return false;
    },
  });

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = submission?.status;

    if (!prev || !submission?.status || prev === submission.status) return;

    if (["approved", "rejected", "failed"].includes(submission.status)) {
      setStatusMessage("Your submission has been updated.");
    }
  }, [submission?.status]);

  const handleEdit = () => {
    router.push(`/submission/${studioId}/${submissionId}/edit`);
  };

  const handleCancel = async () => {
    if (!studioId || !submissionId) return;
    try {
      await cancelSubmission(studioId, submissionId);
      queryClient.invalidateQueries({
        queryKey: ["submission", studioId, submissionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["submissions", studioId],
      });
    } catch (err) {
      setErrorMessage("This submission can no longer be cancelled");
      queryClient.invalidateQueries({
        queryKey: ["submission", studioId, submissionId],
      });
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading submission..." />;
  }

  if (error || !submission) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.colors.background }]}
      >
        <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
          Failed to load submission
        </Text>
      </View>
    );
  }

  const status: SubmissionStatus = submission.status;

  const formattedCreated = new Date(submission.createdAt).toLocaleDateString(
    undefined,
    {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  const formattedUpdated = new Date(submission.updatedAt).toLocaleDateString(
    undefined,
    {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Card>
        <Text variant="headlineSmall" style={styles.title}>
          {submission.title || "Untitled"}
        </Text>
        <StatusBadge status={status} />
      </Card>

      <Card style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>
          Details
        </Text>
        <View style={styles.detailRow}>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Cards
          </Text>
          <Text variant="bodyMedium">{submission.cardsInput.length}</Text>
        </View>
        <Divider style={styles.divider} />
        <View style={styles.detailRow}>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Created
          </Text>
          <Text variant="bodyMedium">{formattedCreated}</Text>
        </View>
        <Divider style={styles.divider} />
        <View style={styles.detailRow}>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Last Updated
          </Text>
          <Text variant="bodyMedium">{formattedUpdated}</Text>
        </View>
        {submission.deckId && (
          <>
            <Divider style={styles.divider} />
            <View style={styles.detailRow}>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Deck ID
              </Text>
              <Text variant="bodyMedium">{submission.deckId}</Text>
            </View>
          </>
        )}
      </Card>

      {submission.rejectionReason && (
        <Card style={styles.section}>
          <Text
            variant="titleSmall"
            style={[styles.sectionTitle, { color: theme.colors.error }]}
          >
            Rejection Reason
          </Text>
          <Text variant="bodyMedium">{submission.rejectionReason}</Text>
        </Card>
      )}

      {/* TODO: translate error codes to user-friendly strings */}
      {submission.errorCode && status === "failed" && (
        <Card style={styles.section}>
          <Text
            variant="titleSmall"
            style={[styles.sectionTitle, { color: theme.colors.error }]}
          >
            Error
          </Text>
          <Text variant="bodyMedium">{submission.errorCode}</Text>
        </Card>
      )}

      <View style={styles.actions}>
        {status === "draft" && <Button title="Edit" onPress={handleEdit} />}

        {(status === "draft" || status === "submitted") && (
          <Button
            title="Cancel Submission"
            onPress={() => setShowCancelDialog(true)}
            variant="danger"
          />
        )}
      </View>

      <Portal>
        <Dialog
          visible={showCancelDialog}
          onDismiss={() => setShowCancelDialog(false)}
          style={{ maxWidth: DIALOG_MAX_WIDTH, alignSelf: "center" }}
        >
          <Dialog.Title>Cancel Submission</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to cancel this submission? This cannot be
              undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <PaperButton onPress={() => setShowCancelDialog(false)}>
              Back
            </PaperButton>
            <PaperButton
              textColor={theme.colors.error}
              onPress={() => {
                setShowCancelDialog(false);
                handleCancel();
              }}
            >
              Cancel Submission
            </PaperButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={errorMessage !== null}
        onDismiss={() => setErrorMessage(null)}
        duration={5000}
        style={{ backgroundColor: theme.colors.error }}
      >
        {errorMessage}
      </Snackbar>

      <Snackbar
        visible={statusMessage !== null}
        onDismiss={() => setStatusMessage(null)}
        duration={5000}
      >
        {statusMessage}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    marginBottom: 12,
  },
  section: {
    marginTop: 0,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  divider: {
    marginVertical: 8,
  },
  actions: {
    gap: 32,
    marginTop: 8,
  },
});
