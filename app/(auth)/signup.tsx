import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text, useTheme } from "react-native-paper";

import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { Input } from "@/components/ui/Input";
import { SocialAuthButton } from "@/components/ui/SocialAuthButton";
import { ThemeToggleButton } from "@/components/ui/ThemeToggleButton";
import { useAuth } from "@/contexts/AuthContext";

export default function SignupScreen() {
  const {
    signUp,
    signInWithGoogle,
    signInWithApple,
    isLoading,
    isGoogleAuthAvailable,
    isAppleAuthAvailable,
    user,
  } = useAuth();
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(
    null
  );

  if (user) {
    router.replace("/(tabs)");
    return null;
  }

  const validateForm = () => {
    const newErrors: {
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Invalid email format";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    setSubmitError(null);
    if (!validateForm()) return;

    try {
      await signUp(email.trim(), password);
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Sign up failed:", error);
      const message = "Unable to create account. Please try again.";
      setSubmitError(message);
    }
  };

  const handleGoogleSignIn = async () => {
    setSubmitError(null);
    setSocialLoading("google");
    try {
      await signInWithGoogle();
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Google sign-in failed:", error);
      setSubmitError("Google sign-in failed. Please try again.");
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    setSubmitError(null);
    setSocialLoading("apple");
    try {
      await signInWithApple();
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Apple sign-in failed:", error);
      setSubmitError("Apple sign-in failed. Please try again.");
    } finally {
      setSocialLoading(null);
    }
  };

  const isSocialLoading = socialLoading !== null;

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
            Lingo Admin
          </Text>
          <Text
            variant="bodyMedium"
            style={{
              color: theme.colors.onSurfaceVariant,
              textAlign: "center",
            }}
          >
            Sign up for a Lingo House admin account
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

          {(isGoogleAuthAvailable || isAppleAuthAvailable) && (
            <>
              <View style={styles.socialButtons}>
                {isGoogleAuthAvailable && (
                  <SocialAuthButton
                    provider="google"
                    onPress={handleGoogleSignIn}
                    loading={socialLoading === "google"}
                    disabled={isSocialLoading || isLoading}
                  />
                )}
                {isAppleAuthAvailable && (
                  <SocialAuthButton
                    provider="apple"
                    onPress={handleAppleSignIn}
                    loading={socialLoading === "apple"}
                    disabled={isSocialLoading || isLoading}
                  />
                )}
              </View>

              <Divider />
            </>
          )}

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

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            secureTextEntry
            autoComplete="new-password"
            error={errors.password}
          />

          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter your password"
            secureTextEntry
            autoComplete="new-password"
            error={errors.confirmPassword}
          />

          <Button
            title="Create Account"
            onPress={handleSignup}
            loading={isLoading}
            disabled={isSocialLoading}
            style={styles.button}
          />
        </View>

        <View style={styles.footer}>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Already have an account?
          </Text>
          <Pressable onPress={() => router.replace("/(auth)/login" as never)}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.primary, fontWeight: "600" }}
            >
              Sign in
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
  socialButtons: {
    gap: 24,
  },
  button: {
    marginTop: 24,
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
