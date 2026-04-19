import { useEffect } from "react";
import { View, StyleSheet, Linking } from "react-native";
import { router } from "expo-router";
import { Text, ActivityIndicator, useTheme } from "react-native-paper";
import { getStripeOnboardingUrl } from "@/lib/api/monetization";

/**
 * Stripe onboarding refresh screen.
 * When a Stripe onboarding link expires, the user lands here.
 * We generate a fresh link, open it, then redirect to /monetization.
 */
export default function OnboardingRefreshScreen() {
  const theme = useTheme();

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const { url } = await getStripeOnboardingUrl();
        if (!cancelled) {
          await Linking.openURL(url);
        }
      } catch {
        // On error, just redirect back to monetization
      } finally {
        if (!cancelled) {
          router.replace("/monetization" as never);
        }
      }
    }

    refresh();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ActivityIndicator
        size="large"
        color={theme.colors.primary}
        style={styles.spinner}
      />
      <Text
        variant="bodyMedium"
        style={{
          color: theme.colors.onSurfaceVariant,
          textAlign: "center",
          marginTop: 16,
        }}
      >
        Refreshing your Stripe session...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  spinner: {
    marginBottom: 8,
  },
});
