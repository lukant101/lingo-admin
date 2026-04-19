import { useState } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { Text, useTheme } from "react-native-paper";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ThemeToggleButton } from "@/components/ui/ThemeToggleButton";

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const validateForm = () => {
    const newErrors: { email?: string } = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    setSubmitError(null);
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (error) {
      console.error("Password reset failed:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to send reset email. Please try again.";
      setSubmitError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ThemeToggleButton
        style={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text
            variant="headlineMedium"
            style={{ color: theme.colors.onBackground }}
          >
            Reset Password
          </Text>
          <Text
            variant="bodyMedium"
            style={{
              color: theme.colors.onSurfaceVariant,
              textAlign: "center",
            }}
          >
            {sent
              ? "Check your email for a reset link"
              : "Enter your email and we'll send you a link to reset your password"}
          </Text>
        </View>

        <View style={styles.form}>
          {submitError && (
            <View
              style={[
                styles.errorBanner,
                { backgroundColor: theme.colors.error },
              ]}
            >
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onError }}
              >
                {submitError}
              </Text>
            </View>
          )}

          {!sent ? (
            <>
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={errors.email}
              />

              <Button
                title="Send Reset Link"
                onPress={handleResetPassword}
                loading={isLoading}
                style={styles.button}
              />
            </>
          ) : (
            <Button
              title="Back to Sign In"
              onPress={() => router.replace("/(auth)/login")}
              style={styles.button}
            />
          )}
        </View>

        <View style={styles.footer}>
          <Pressable onPress={() => router.replace("/(auth)/login")}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.primary, fontWeight: "600" }}
            >
              Back to Sign In
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
    gap: 8,
  },
  form: {
    marginBottom: 24,
  },
  button: {
    marginTop: 8,
  },
  footer: {
    alignItems: "center",
    gap: 6,
  },
  errorBanner: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
});
