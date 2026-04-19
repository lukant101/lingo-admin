import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  StyledSnackbar,
  type SnackbarState,
} from "@/components/ui/StyledSnackbar";
import { COLORS } from "@/constants/theme";
import { useCreatorAccount } from "@/contexts/CreatorAccountContext";
import { withdrawCreatorApplication } from "@/lib/api/creator";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Dialog,
  Icon,
  Button as PaperButton,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";

export default function CreatorStatusScreen() {
  const { creatorAccount, isLoading, refreshCreatorAccount } =
    useCreatorAccount();
  const theme = useTheme();
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  if (isLoading) {
    return <LoadingSpinner message="Loading status..." />;
  }

  const getStatusInfo = () => {
    // Check creatorStatus first (post-approval states)
    if (creatorAccount?.creatorStatus === "active") {
      return creatorAccount.creatorTier === "premium"
        ? {
            icon: "star-outline" as const,
            color: COLORS.SUCCESS_GREEN,
            title: "Creator (with premium features)",
            description:
              "Congratulations! Your application has been approved. You can now upload content on the Studios page.",
          }
        : {
            icon: "check-circle-outline" as const,
            color: COLORS.SUCCESS_GREEN,
            title: "Creator",
            description:
              "Congratulations! Your application has been approved. You can now upload content on the Studios page.",
          };
    }
    if (creatorAccount?.creatorStatus === "suspended") {
      return {
        icon: "pause-circle-outline" as const,
        color: theme.colors.tertiary,
        title: "Account Suspended",
        description:
          "Your creator account has been temporarily suspended. Please contact support for more information.",
      };
    }
    if (creatorAccount?.creatorStatus === "banned") {
      return {
        icon: "cancel" as const,
        color: theme.colors.error,
        title: "Account Banned",
        description: "Your creator account has been permanently banned.",
      };
    }

    // Then check applicationStatus
    switch (creatorAccount?.applicationStatus) {
      case "applied":
        return {
          icon: "timer-sand" as const,
          color: theme.colors.tertiary,
          title: "Application Submitted",
          description:
            "Your application is in the queue. We'll review it as soon as possible.",
        };
      case "in_review":
        return {
          icon: "eye-outline" as const,
          color: theme.colors.primary,
          title: "Under Review",
          description:
            "Your application is currently being reviewed by our team. We'll notify you once a decision is made.",
        };
      case "rejected":
        return {
          icon: "close-circle-outline" as const,
          color: theme.colors.error,
          title: "Application Rejected",
          description: creatorAccount.canReapplyAt
            ? `Your application was not approved. You can reapply after ${new Date(creatorAccount.canReapplyAt).toLocaleDateString()}.`
            : "Your application was not approved at this time.",
        };
      case "rejected_terminal":
        return {
          icon: "cancel" as const,
          color: theme.colors.error,
          title: "Permanently Rejected",
          description:
            "Your application has been permanently rejected and you cannot reapply.",
        };
      case "withdrawn":
        return {
          icon: "undo-variant" as const,
          color: theme.colors.onSurfaceVariant,
          title: "Application Withdrawn",
          description: creatorAccount.canReapplyAt
            ? `You withdrew your application. You can reapply after ${new Date(creatorAccount.canReapplyAt).toLocaleDateString()}.`
            : "You withdrew your application. You can submit a new application anytime.",
        };
      default:
        return {
          icon: "help-circle-outline" as const,
          color: theme.colors.onSurfaceVariant,
          title: "Unknown Status",
          description: "Unable to determine your application status.",
        };
    }
  };

  const handleWithdrawConfirm = async () => {
    setShowWithdrawDialog(false);
    setWithdrawing(true);
    try {
      await withdrawCreatorApplication();
      await refreshCreatorAccount();
      setSnackbar({ message: "Application withdrawn.", type: "success" });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to withdraw application";
      setSnackbar({ message, type: "error" });
    } finally {
      setWithdrawing(false);
    }
  };

  const statusInfo = getStatusInfo();
  const canWithdraw =
    creatorAccount?.applicationStatus === "applied" ||
    creatorAccount?.applicationStatus === "in_review";

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: statusInfo.color
                    .replace("rgb(", "rgba(")
                    .replace(")", ", 0.12)"),
                },
              ]}
            >
              <Icon
                source={statusInfo.icon}
                size={40}
                color={statusInfo.color}
              />
            </View>
            <Text
              variant="headlineSmall"
              style={{ color: theme.colors.onSurface, textAlign: "center" }}
            >
              {statusInfo.title}
            </Text>
          </View>

          <Text
            variant="bodyMedium"
            style={[
              styles.statusDescription,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {statusInfo.description}
          </Text>

          {creatorAccount?.updatedAt && (
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: "center",
              }}
            >
              Last updated:{" "}
              {new Date(creatorAccount.updatedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          )}
        </Card>

        {canWithdraw && (
          <Button
            title="Withdraw Application"
            variant="danger"
            onPress={() => setShowWithdrawDialog(true)}
            loading={withdrawing}
            style={styles.withdrawButton}
          />
        )}

        <Button
          title="Back to Dashboard"
          variant="outline"
          onPress={() => router.back()}
          style={styles.backButton}
        />
      </ScrollView>

      <Portal>
        <Dialog
          visible={showWithdrawDialog}
          onDismiss={() => setShowWithdrawDialog(false)}
        >
          <Dialog.Title>Withdraw Application</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to withdraw your application? You can submit
              a new application later.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <PaperButton onPress={() => setShowWithdrawDialog(false)}>
              Cancel
            </PaperButton>
            <PaperButton
              textColor={theme.colors.error}
              onPress={handleWithdrawConfirm}
            >
              Withdraw
            </PaperButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <StyledSnackbar
        snackbar={snackbar}
        onDismiss={() => {
          const type = snackbar?.type;
          setSnackbar(null);
          if (type === "success") router.back();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  statusCard: {
    alignItems: "center",
    padding: 24,
    marginBottom: 24,
  },
  statusHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  statusDescription: {
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  withdrawButton: {
    marginTop: 32,
  },
  backButton: {
    marginTop: 32,
  },
});
