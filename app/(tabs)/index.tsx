import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { COLORS } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatorAccount } from "@/contexts/CreatorAccountContext";
import { useMonetizationReadiness } from "@/hooks/useMonetizationReadiness";
import { getVariantName } from "@/lib/languages";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Snackbar, Text, useTheme } from "react-native-paper";

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const { creatorAccount, isLoading, error, refreshCreatorAccount } =
    useCreatorAccount();
  const { monetizationReadiness } = useMonetizationReadiness({
    enabled: creatorAccount?.creatorStatus === "active",
  });
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshCreatorAccount();
    setRefreshing(false);
  }, [refreshCreatorAccount]);

  const showRefreshError = !!error && !!creatorAccount;
  const previousShowRefreshError = usePrevious(showRefreshError);
  useEffect(() => {
    if (showRefreshError && !previousShowRefreshError) {
      setSnackbarVisible(true);
    }
  }, [showRefreshError, previousShowRefreshError]);

  const languageNames = useMemo(
    () => (creatorAccount?.langVariantCodes ?? []).map(getVariantName),
    [creatorAccount?.langVariantCodes]
  );

  if (isLoading) {
    return <LoadingSpinner message="Loading your account..." />;
  }

  if (error && !creatorAccount) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.errorContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <FontAwesome
              name="exclamation-circle"
              size={24}
              color={theme.colors.error}
            />
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface, marginLeft: 8 }}
            >
              Something went wrong
            </Text>
          </View>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}
          >
            {error}
          </Text>
          <Button title="Retry" variant="primary" onPress={onRefresh} />
        </Card>
      </ScrollView>
    );
  }

  const getStatusColor = () => {
    if (creatorAccount?.creatorStatus === "active") return COLORS.SUCCESS_GREEN;
    if (
      creatorAccount?.creatorStatus === "suspended" ||
      creatorAccount?.creatorStatus === "banned"
    )
      return theme.colors.error;
    if (
      creatorAccount?.applicationStatus === "applied" ||
      creatorAccount?.applicationStatus === "in_review"
    )
      return theme.colors.tertiary;
    if (
      creatorAccount?.applicationStatus === "rejected" ||
      creatorAccount?.applicationStatus === "rejected_terminal"
    )
      return theme.colors.error;
    return theme.colors.onSurfaceVariant;
  };

  const getStatusLabel = () => {
    if (creatorAccount?.creatorStatus === "active") return "Active";
    if (creatorAccount?.creatorStatus === "suspended") return "Suspended";
    if (creatorAccount?.creatorStatus === "banned") return "Banned";
    if (creatorAccount?.creatorStatus === "maintenance")
      return "Maintenance Mode";
    if (creatorAccount?.creatorStatus === "country_ineligible")
      return "Country Ineligible";

    switch (creatorAccount?.applicationStatus) {
      case "applied":
        return "Submitted";
      case "in_review":
        return "Under Review";
      case "withdrawn":
        return "Withdrawn";
      case "rejected":
        return "Rejected";
      case "rejected_terminal":
        return "Permanently Rejected";
      default:
        return "Not a Creator";
    }
  };

  const isCreator = !!creatorAccount?.creatorStatus;

  const isActiveCreator = creatorAccount?.creatorStatus === "active";

  const canApply =
    !creatorAccount ||
    creatorAccount.applicationStatus === null ||
    creatorAccount.applicationStatus === "withdrawn" ||
    (creatorAccount.applicationStatus === "rejected" &&
      (!creatorAccount.canReapplyAt ||
        new Date(creatorAccount.canReapplyAt) <= new Date()));

  const isPending =
    creatorAccount?.applicationStatus === "applied" ||
    creatorAccount?.applicationStatus === "in_review";

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text
            variant="bodyLarge"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {user?.email || "Unknown Email Address"}
          </Text>
        </View>

        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <FontAwesome
              name="paint-brush"
              size={24}
              color={theme.colors.primary}
            />
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface, marginLeft: 8 }}
            >
              {isCreator ? "Creator" : "Application"}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Status
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: getStatusColor(), fontWeight: "600" }}
            >
              {getStatusLabel()}
            </Text>
          </View>

          {creatorAccount?.creatorTier === "premium" && (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.primary, marginBottom: 8 }}
            >
              Premium creator features enabled.
            </Text>
          )}

          {creatorAccount?.maxStudios != null && (
            <View style={styles.detailRow}>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Maximum number of studios
              </Text>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurface }}
              >
                {creatorAccount.maxStudios}
              </Text>
            </View>
          )}

          {languageNames.length > 0 && (
            <View style={styles.detailColumn}>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {languageNames.length === 1 ? "Language" : "Languages"}
              </Text>
              {languageNames.map((name) => (
                <Text
                  key={name}
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurface }}
                >
                  {name}
                </Text>
              ))}
            </View>
          )}

          {canApply && (
            <Button
              title="Apply"
              variant="primary"
              style={styles.actionButton}
              onPress={() => router.push("/creator/application" as never)}
            />
          )}

          {isPending && (
            <Button
              title="View Details"
              variant="outline"
              style={styles.actionButton}
              onPress={() =>
                router.push("/creator/application/status" as never)
              }
            />
          )}
        </Card>

        {isActiveCreator && (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome
                name="dollar"
                size={20}
                color={theme.colors.primary}
              />
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.onSurface, marginLeft: 8 }}
              >
                Monetization
              </Text>
            </View>

            {monetizationReadiness.loading ? (
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Checking payment status...
              </Text>
            ) : !monetizationReadiness.account ? (
              <>
                <Text
                  variant="bodyMedium"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    marginBottom: 12,
                  }}
                >
                  Set up your Stripe account to start receiving payments for
                  your content.
                </Text>
                <Button
                  title="Set Up Payments"
                  variant="primary"
                  style={styles.cardButton}
                  onPress={() => router.push("/monetization" as never)}
                />
              </>
            ) : !monetizationReadiness.canAcceptPayments ||
              !monetizationReadiness.canReceivePayouts ? (
              <>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.tertiary, marginBottom: 12 }}
                >
                  Your payment account needs attention — complete Stripe
                  onboarding to enable payments.
                </Text>
                <Button
                  title="Complete Setup"
                  variant="primary"
                  style={styles.cardButton}
                  onPress={() => router.push("/monetization" as never)}
                />
              </>
            ) : (
              <Button
                title="Manage Payments"
                variant="outline"
                style={styles.cardButton}
                onPress={() => router.push("/monetization" as never)}
              />
            )}
          </Card>
        )}
      </ScrollView>
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        action={{ label: "Retry", onPress: onRefresh }}
      >
        {error}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  errorContent: {
    padding: 16,
    flex: 1,
    justifyContent: "center",
  },
  header: {
    marginBottom: 24,
  },
  statusCard: {
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  detailColumn: {
    marginBottom: 8,
  },
  actionButton: {
    marginTop: 8,
  },
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  cardButton: {
    marginTop: 4,
  },
});
