import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  StyledSnackbar,
  type SnackbarState,
} from "@/components/ui/StyledSnackbar";
import { COLORS } from "@/constants/theme";
import { useCreatorAccount } from "@/contexts/CreatorAccountContext";
import { useMonetizationReadiness } from "@/hooks/useMonetizationReadiness";
import {
  acceptCreatorAgreement,
  createMonetizationAccount,
  getCurrentAgreementVersion,
  getStripeOnboardingUrl,
  getStripePortalUrl,
} from "@/lib/api/monetization";
import { humanizeStripeFields } from "@/lib/stripe-utils";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Checkbox, Text, useTheme } from "react-native-paper";

export default function MonetizationScreen() {
  const { creatorAccount, isLoading: accountLoading } = useCreatorAccount();
  const { monetizationReadiness, fetchMonetizationAccount } =
    useMonetizationReadiness();
  const theme = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [stripeEmail, setStripeEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [openingStripe, setOpeningStripe] = useState(false);
  const [openingDashboard, setOpeningDashboard] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  // Terms acceptance state
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreementVersion, setAgreementVersion] = useState<string | null>(null);

  useEffect(() => {
    getCurrentAgreementVersion()
      .then((result) => {
        if (result) {
          setAgreementVersion(result.version);
        }
      })
      .catch(() => {});
  }, []);

  const { account, loading, error, canAcceptPayments, canReceivePayouts } =
    monetizationReadiness;

  const canAccess = creatorAccount?.creatorStatus === "active";
  const showSetup = !account || !account.detailsSubmitted;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMonetizationAccount();
    setRefreshing(false);
  }, [fetchMonetizationAccount]);

  const handleCreateAccount = async () => {
    setCreating(true);
    try {
      await createMonetizationAccount({
        email: stripeEmail.trim() || undefined,
      });

      if (agreementVersion) {
        await acceptCreatorAgreement(agreementVersion);
      }

      await fetchMonetizationAccount();

      // Open Stripe onboarding
      const { url } = await getStripeOnboardingUrl();
      await Linking.openURL(url);
    } catch (err) {
      console.error("Failed to create account:", err);
      setSnackbar({
        message: "Failed to create account. Please try again.",
        type: "error",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleOpenStripeOnboarding = async () => {
    setOpeningStripe(true);
    try {
      const { url } = await getStripeOnboardingUrl();
      await Linking.openURL(url);
    } catch (err) {
      console.error("Failed to open Stripe onboarding:", err);
      setSnackbar({
        message: "Failed to open Stripe onboarding. Please try again.",
        type: "error",
      });
    } finally {
      setOpeningStripe(false);
    }
  };

  const handleOpenStripeDashboard = async () => {
    setOpeningDashboard(true);
    try {
      const { url } = await getStripePortalUrl();
      await Linking.openURL(url);
    } catch (err) {
      console.error("Failed to open Stripe Dashboard:", err);
      setSnackbar({
        message: "Failed to open Stripe Dashboard. Please try again.",
        type: "error",
      });
    } finally {
      setOpeningDashboard(false);
    }
  };

  if (accountLoading || loading) {
    return <LoadingSpinner message="Loading monetization status..." />;
  }

  if (!canAccess) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <FontAwesome
          name="lock"
          size={48}
          color={theme.colors.onSurfaceVariant}
        />
        <Text
          variant="titleMedium"
          style={[styles.emptyTitle, { color: theme.colors.onBackground }]}
        >
          Monetization Locked
        </Text>
        <Text
          variant="bodyLarge"
          style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
        >
          Complete your creator application to access monetization features
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <FontAwesome
          name="exclamation-circle"
          size={48}
          color={theme.colors.error}
        />
        <Text
          variant="titleMedium"
          style={[styles.emptyTitle, { color: theme.colors.onBackground }]}
        >
          {error}
        </Text>
        <Button title="Retry" onPress={onRefresh} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {showSetup ? (
          <SetupView
            theme={theme}
            stripeEmail={stripeEmail}
            setStripeEmail={setStripeEmail}
            agreedToTerms={agreedToTerms}
            setAgreedToTerms={setAgreedToTerms}
            agreementVersion={agreementVersion}
            creating={creating}
            onCreateAccount={handleCreateAccount}
            account={account}
            openingStripe={openingStripe}
            onOpenStripeOnboarding={handleOpenStripeOnboarding}
          />
        ) : (
          <ActiveAccountView
            theme={theme}
            account={account!}
            canAcceptPayments={canAcceptPayments}
            canReceivePayouts={canReceivePayouts}
            openingDashboard={openingDashboard}
            onOpenStripeDashboard={handleOpenStripeDashboard}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        )}
      </ScrollView>

      <StyledSnackbar snackbar={snackbar} onDismiss={() => setSnackbar(null)} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Setup View — shown when no account or details not yet submitted
// ---------------------------------------------------------------------------

import type { SellerAccount } from "@/types/payout";
import type { MD3Theme } from "react-native-paper";

type SetupViewProps = {
  theme: MD3Theme;
  stripeEmail: string;
  setStripeEmail: (v: string) => void;
  agreedToTerms: boolean;
  setAgreedToTerms: (v: boolean) => void;
  agreementVersion: string | null;
  creating: boolean;
  onCreateAccount: () => void;
  account: SellerAccount | null;
  openingStripe: boolean;
  onOpenStripeOnboarding: () => void;
};

function SetupView({
  theme,
  stripeEmail,
  setStripeEmail,
  agreedToTerms,
  setAgreedToTerms,
  agreementVersion,
  creating,
  onCreateAccount,
  account,
  openingStripe,
  onOpenStripeOnboarding,
}: SetupViewProps) {
  // Account exists but details not submitted — just show continue button
  if (account && !account.detailsSubmitted) {
    return (
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <FontAwesome
            name="credit-card"
            size={24}
            color={theme.colors.primary}
          />
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurface, marginLeft: 10 }}
          >
            Complete Stripe Setup
          </Text>
        </View>
        <Text
          variant="bodyLarge"
          style={{
            color: theme.colors.onSurfaceVariant,
            lineHeight: 24,
            marginBottom: 16,
          }}
        >
          Your account has been created but Stripe setup is not yet complete.
          Continue where you left off to start receiving payments.
        </Text>
        <Button
          title="Continue Stripe Setup"
          onPress={onOpenStripeOnboarding}
          loading={openingStripe}
          style={styles.actionButton}
        />
        <Text
          variant="bodyMedium"
          style={{
            color: theme.colors.onSurfaceVariant,
            marginTop: 8,
            textAlign: "center",
          }}
        >
          You'll be redirected to Stripe to complete account set-up.
        </Text>
      </Card>
    );
  }

  return (
    <>
      {/* Card 1: Get Started */}
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <FontAwesome name="rocket" size={24} color={theme.colors.primary} />
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurface, marginLeft: 10 }}
          >
            Get Started with Monetization
          </Text>
        </View>
        <Text
          variant="bodyLarge"
          style={{
            color: theme.colors.onSurfaceVariant,
            lineHeight: 24,
            marginBottom: 16,
          }}
        >
          Set up a Stripe account to start receiving payments from your content
          sales. Here's what you'll need:
        </Text>

        <View style={styles.requirementRow}>
          <FontAwesome name="id-card" size={18} color={theme.colors.primary} />
          <View style={styles.requirementText}>
            <Text
              variant="bodyLarge"
              style={{
                color: theme.colors.onSurface,
                fontWeight: "600",
              }}
            >
              Personal Information
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Government-issued ID and proof of address for identity
              verification
            </Text>
          </View>
        </View>

        <View style={styles.requirementRow}>
          <FontAwesome name="bank" size={18} color={theme.colors.primary} />
          <View style={styles.requirementText}>
            <Text
              variant="bodyLarge"
              style={{
                color: theme.colors.onSurface,
                fontWeight: "600",
              }}
            >
              Bank Account Details
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Account and routing numbers to receive payouts
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.infoBlock,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <FontAwesome
            name="info-circle"
            size={16}
            color={theme.colors.primary}
          />
          <Text
            variant="bodyLarge"
            style={{
              color: theme.colors.onSurfaceVariant,
              flex: 1,
              marginLeft: 8,
              lineHeight: 22,
            }}
          >
            <Text style={{ fontWeight: "700" }}>How it works: </Text>Customer
            payments go to your Stripe account. The platform takes a 15% fee
            from each sale, and you receive 85%. In addition, the{" "}
            <Text
              variant="bodyLarge"
              style={{
                color: theme.colors.primary,
                textDecorationLine: "underline",
              }}
              onPress={() => Linking.openURL("https://stripe.com/pricing")}
            >
              Stripe processing fees
            </Text>{" "}
            (~2.9% + €0.25 per transaction) are paid from your 85% share. You
            have full control over the transfer of earnings to your bank
            account.
          </Text>
        </View>

        <View
          style={[
            styles.warningBlock,
            {
              backgroundColor: "#FFF3E0",
              borderColor: "#FF9800",
            },
          ]}
        >
          <FontAwesome name="exclamation-triangle" size={16} color="#E65100" />
          <Text
            variant="bodyLarge"
            style={{
              color: "#E65100",
              flex: 1,
              marginLeft: 8,
              lineHeight: 22,
            }}
          >
            <Text style={{ fontWeight: "700" }}>Note: </Text>Due to regulatory
            restrictions, creators based in Brazil are not supported.
          </Text>
        </View>
      </Card>

      {/* Card 2: Stripe Account Email */}
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <FontAwesome
            name="envelope-o"
            size={20}
            color={theme.colors.primary}
          />
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurface, marginLeft: 10 }}
          >
            Stripe Account Email (Optional)
          </Text>
        </View>
        <Input
          label="Email"
          value={stripeEmail}
          onChangeText={setStripeEmail}
          placeholder="your-email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          If you would like to use a different email address for your Stripe
          account, please specify it here. Otherwise, leave blank to use your
          Lingo House account email.
        </Text>
      </Card>

      {/* Card 3: Creator Agreement */}
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <FontAwesome
            name="file-text-o"
            size={20}
            color={theme.colors.primary}
          />
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurface, marginLeft: 10 }}
          >
            Creator Agreement
          </Text>
        </View>
        <Text
          variant="bodyMedium"
          style={{
            color: theme.colors.onSurfaceVariant,
            lineHeight: 22,
            marginBottom: 12,
          }}
        >
          By setting up monetization you agree to our Creator Agreement, which
          covers platform fees, payment terms, and content requirements.
        </Text>
        <Pressable
          style={styles.checkboxRow}
          onPress={() => setAgreedToTerms(!agreedToTerms)}
        >
          <Checkbox
            status={agreedToTerms ? "checked" : "unchecked"}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
          />
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurface, flex: 1 }}
          >
            I accept the{" "}
            {agreementVersion ? (
              <Text
                variant="bodyMedium"
                style={{
                  color: theme.colors.primary,
                  textDecorationLine: "underline",
                  fontWeight: "600",
                }}
                onPress={() =>
                  Linking.openURL(
                    `${window.location.origin}/terms/creators/${agreementVersion}`
                  )
                }
              >
                Creator Agreement
              </Text>
            ) : (
              "Creator Agreement"
            )}
          </Text>
        </Pressable>
      </Card>

      {/* Card 4: Submit */}
      <Card style={styles.card}>
        <Button
          title="Set up Stripe"
          onPress={onCreateAccount}
          loading={creating}
          disabled={!agreedToTerms}
          style={styles.actionButton}
        />
        <Text
          variant="bodyMedium"
          style={{
            color: theme.colors.onSurfaceVariant,
            marginTop: 8,
            textAlign: "center",
          }}
        >
          You'll be redirected to Stripe to complete account set-up. This
          usually takes 15 minutes.
        </Text>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Requirements Alert — surfaces Stripe requirements between status & details
// ---------------------------------------------------------------------------

function humanizeDisabledReason(reason: string): string {
  const map: Record<string, string> = {
    "requirements.past_due":
      "Required information is overdue. Please update your Stripe account.",
    "requirements.pending_verification":
      "Your information is being verified by Stripe.",
    listed: "Your account has been flagged for review.",
    platform_paused: "Payments have been paused by the platform.",
    "rejected.fraud": "Your account was rejected due to suspected fraud.",
    "rejected.terms_of_service":
      "Your account was rejected for a terms of service violation.",
    "rejected.listed":
      "Your account was rejected because it appears on a prohibited list.",
    "rejected.other": "Your account was rejected.",
    under_review: "Your account is under review by Stripe.",
    other: "Your account has been restricted.",
  };
  return map[reason] ?? `Account restricted: ${reason.replace(/[._]/g, " ")}`;
}

function RequirementsAlert({
  account,
  theme,
}: {
  account: SellerAccount;
  theme: MD3Theme;
}) {
  const {
    disabledReason,
    pastDue,
    currentlyDue,
    pendingVerification,
    currentDeadline,
  } = account;

  // Info: pending verification (not an error)
  if (disabledReason === "requirements.pending_verification") {
    return (
      <View
        style={[
          styles.infoBlock,
          { backgroundColor: theme.colors.surfaceVariant },
        ]}
      >
        <FontAwesome name="clock-o" size={16} color={theme.colors.primary} />
        <Text
          variant="bodyLarge"
          style={{
            color: theme.colors.onSurfaceVariant,
            flex: 1,
            marginLeft: 8,
            lineHeight: 22,
          }}
        >
          {humanizeDisabledReason(disabledReason)} This usually takes 1-2
          business days.
        </Text>
      </View>
    );
  }

  // Error: account disabled
  if (disabledReason) {
    return (
      <View
        style={[
          styles.warningBlock,
          {
            backgroundColor: theme.colors.errorContainer,
            borderColor: theme.colors.onErrorContainer,
          },
        ]}
      >
        <FontAwesome
          name="exclamation-circle"
          size={16}
          color={theme.colors.onErrorContainer}
        />
        <Text
          variant="bodyLarge"
          style={{
            color: theme.colors.onErrorContainer,
            flex: 1,
            marginLeft: 8,
            lineHeight: 22,
          }}
        >
          {humanizeDisabledReason(disabledReason)} Open the Stripe Dashboard
          below to resolve this.
        </Text>
      </View>
    );
  }

  // Warning: past-due items
  if (pastDue.length > 0) {
    const items = humanizeStripeFields(pastDue).join(", ");
    const deadline = currentDeadline
      ? ` Complete by ${new Date(currentDeadline).toLocaleDateString()}.`
      : "";
    return (
      <View
        style={[
          styles.warningBlock,
          { backgroundColor: "#FFF3E0", borderColor: "#FF9800" },
        ]}
      >
        <FontAwesome name="exclamation-triangle" size={16} color="#E65100" />
        <Text
          variant="bodyLarge"
          style={{ color: "#E65100", flex: 1, marginLeft: 8, lineHeight: 22 }}
        >
          <Text style={{ fontWeight: "700" }}>Action overdue: </Text>
          {items}.{deadline} Open the Stripe Dashboard below to update.
        </Text>
      </View>
    );
  }

  // Warning: currently-due items (no past-due)
  if (currentlyDue.length > 0) {
    const items = humanizeStripeFields(currentlyDue).join(", ");
    return (
      <View
        style={[
          styles.warningBlock,
          { backgroundColor: "#FFF3E0", borderColor: "#FF9800" },
        ]}
      >
        <FontAwesome name="exclamation-triangle" size={16} color="#E65100" />
        <Text
          variant="bodyLarge"
          style={{ color: "#E65100", flex: 1, marginLeft: 8, lineHeight: 22 }}
        >
          <Text style={{ fontWeight: "700" }}>Action needed: </Text>
          {items}. Open the Stripe Dashboard below to complete.
        </Text>
      </View>
    );
  }

  // Info: pending verification only
  if (pendingVerification.length > 0) {
    const items = humanizeStripeFields(pendingVerification).join(", ");
    return (
      <View
        style={[
          styles.infoBlock,
          { backgroundColor: theme.colors.surfaceVariant },
        ]}
      >
        <FontAwesome name="clock-o" size={16} color={theme.colors.primary} />
        <Text
          variant="bodyLarge"
          style={{
            color: theme.colors.onSurfaceVariant,
            flex: 1,
            marginLeft: 8,
            lineHeight: 22,
          }}
        >
          <Text style={{ fontWeight: "700" }}>Verification in progress: </Text>
          {items}. Usually takes 1-2 business days.
        </Text>
      </View>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Active Account View — shown when detailsSubmitted is true
// ---------------------------------------------------------------------------

type ActiveAccountViewProps = {
  theme: MD3Theme;
  account: SellerAccount;
  canAcceptPayments: boolean;
  canReceivePayouts: boolean;
  openingDashboard: boolean;
  onOpenStripeDashboard: () => void;
  refreshing: boolean;
  onRefresh: () => void;
};

function ActiveAccountView({
  theme,
  account,
  canAcceptPayments,
  canReceivePayouts,
  openingDashboard,
  onOpenStripeDashboard,
  refreshing,
  onRefresh,
}: ActiveAccountViewProps) {
  const fullyEnabled = canAcceptPayments && canReceivePayouts;

  return (
    <>
      {/* Card 1: Stripe Account Status */}
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <FontAwesome name="building" size={24} color={theme.colors.primary} />
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurface, marginLeft: 10 }}
          >
            Stripe Account Status
          </Text>
        </View>

        {/* Payment / Payout capability row */}
        <View style={styles.statusGrid}>
          <View style={styles.statusItem}>
            <FontAwesome
              name={canAcceptPayments ? "check-circle" : "hourglass-half"}
              size={28}
              color={
                canAcceptPayments ? COLORS.SUCCESS_GREEN : theme.colors.tertiary
              }
            />
            <Text
              variant="bodyLarge"
              style={{ color: theme.colors.onSurface, marginTop: 4 }}
            >
              Payment Capability
            </Text>
            <Text
              variant="bodyLarge"
              style={{
                color: canAcceptPayments
                  ? COLORS.SUCCESS_GREEN
                  : theme.colors.tertiary,
                fontWeight: "600",
              }}
            >
              {canAcceptPayments ? "Active" : "Pending"}
            </Text>
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: "center",
                marginTop: 2,
              }}
            >
              {canAcceptPayments
                ? "You can now accept payments from customers."
                : "Complete your Stripe set-up to enable payments."}
            </Text>
          </View>

          <View style={styles.statusItem}>
            <FontAwesome
              name={canReceivePayouts ? "check-circle" : "hourglass-half"}
              size={28}
              color={
                canReceivePayouts ? COLORS.SUCCESS_GREEN : theme.colors.tertiary
              }
            />
            <Text
              variant="bodyLarge"
              style={{ color: theme.colors.onSurface, marginTop: 4 }}
            >
              Payout Capability
            </Text>
            <Text
              variant="bodyLarge"
              style={{
                color: canReceivePayouts
                  ? COLORS.SUCCESS_GREEN
                  : theme.colors.tertiary,
                fontWeight: "600",
              }}
            >
              {canReceivePayouts ? "Active" : "Pending"}
            </Text>
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: "center",
                marginTop: 2,
              }}
            >
              {canReceivePayouts
                ? "You can transfer earnings to your bank account at any time."
                : "Bank transfers are pending verification."}
            </Text>
          </View>
        </View>

        {/* Requirements alert */}
        <RequirementsAlert account={account} theme={theme} />

        {/* Account details */}
        <View
          style={[
            styles.detailsSection,
            { borderTopColor: theme.colors.outlineVariant },
          ]}
        >
          {/* Country */}
          {account.country && (
            <View style={styles.detailRow}>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Country
              </Text>
              <Text
                variant="bodyLarge"
                style={{ color: theme.colors.onSurface }}
              >
                {account.country}
              </Text>
            </View>
          )}

          {/* Currency */}
          {account.currency && (
            <View style={styles.detailRow}>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Currency
              </Text>
              <Text
                variant="bodyLarge"
                style={{ color: theme.colors.onSurface }}
              >
                {account.currency.toUpperCase()}
              </Text>
            </View>
          )}

          {/* Stripe Account ID */}
          <View style={styles.detailRow}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Stripe Account ID
            </Text>
            <Text
              variant="bodyLarge"
              style={{
                color: theme.colors.onSurface,
                fontFamily: Platform.select({
                  ios: "Menlo",
                  android: "monospace",
                  default: "monospace",
                }),
              }}
            >
              {account.stripeAccountId}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Open Stripe Dashboard"
            onPress={onOpenStripeDashboard}
            loading={openingDashboard}
            style={styles.actionButton}
          />

          {!fullyEnabled && (
            <Button
              title="Refresh Status"
              variant="outline"
              onPress={onRefresh}
              loading={refreshing}
              style={{ marginTop: 8 }}
            />
          )}
        </View>
      </Card>

      {/* Card 2: About Your Stripe Payouts */}
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <FontAwesome name="money" size={24} color={theme.colors.primary} />
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurface, marginLeft: 10 }}
          >
            About Your Stripe Payouts
          </Text>
        </View>

        <PayoutInfoItem
          theme={theme}
          icon="credit-card"
          title="Direct Payments"
          description="Customer payments go directly to your Stripe account, not ours."
        />
        <PayoutInfoItem
          theme={theme}
          icon="percent"
          title="15% Platform Fee"
          description={
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant, lineHeight: 22 }}
            >
              Platform takes a 15% fee from each sale. You receive 85%, then pay{" "}
              <Text
                variant="bodyMedium"
                style={{
                  color: theme.colors.primary,
                  textDecorationLine: "underline",
                }}
                onPress={() => Linking.openURL("https://stripe.com/pricing")}
              >
                Stripe processing fees
              </Text>{" "}
              (~2.9% + {"\u20AC"}0.25 per transaction) from your share.
            </Text>
          }
        />
        <PayoutInfoItem
          theme={theme}
          icon="tachometer"
          title="Full Dashboard Access"
          description="View all transactions, manage payouts, and access detailed reports."
        />
        <PayoutInfoItem
          theme={theme}
          icon="calendar"
          title="Flexible Payouts"
          description="Transfer your earnings to your bank account whenever you want."
        />
        <PayoutInfoItem
          theme={theme}
          icon="shield"
          title="Secure & Compliant"
          description="Stripe handles all KYC, fraud prevention, and regulatory compliance."
        />
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Payout info list item
// ---------------------------------------------------------------------------

type PayoutInfoItemProps = {
  theme: MD3Theme;
  icon: string;
  title: string;
  description: React.ReactNode;
};

function PayoutInfoItem({
  theme,
  icon,
  title,
  description,
}: PayoutInfoItemProps) {
  return (
    <View style={styles.payoutItem}>
      <FontAwesome name={icon as any} size={18} color={theme.colors.primary} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurface, fontWeight: "600" }}
        >
          {title}
        </Text>
        {typeof description === "string" ? (
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, lineHeight: 22 }}
          >
            {description}
          </Text>
        ) : (
          description
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  actionButton: {
    marginTop: 8,
  },
  statusGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
  },
  statusItem: {
    alignItems: "center",
    gap: 4,
    flex: 1,
    paddingHorizontal: 8,
  },
  detailsSection: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    minHeight: 44,
  },
  actionButtons: {
    marginTop: 12,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  requirementText: {
    flex: 1,
  },
  infoBlock: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  warningBlock: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 8,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  payoutItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: "center",
  },
});
