import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { Input } from "@/components/ui/Input";
import { SocialAuthButton } from "@/components/ui/SocialAuthButton";
import { ThemeToggleButton } from "@/components/ui/ThemeToggleButton";
import { useAuth } from "@/contexts/AuthContext";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text, useTheme } from "react-native-paper";

export default function LoginScreen() {
  const {
    signIn,
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(
    null
  );

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.replace("/(tabs)");
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    setSubmitError(null);
    if (!validateForm()) return;

    try {
      await signIn(email.trim(), password);
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Login failed:", error);
      setSubmitError("Login failed. Please try again.");
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
            Sign in to the Lingo House Admin console
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
            placeholder="Enter your password"
            secureTextEntry
            autoComplete="password"
            error={errors.password}
          />

          <Pressable
            onPress={() => router.push("/(auth)/forgot-password" as never)}
          >
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.primary,
                textAlign: "right",
                marginTop: 4,
              }}
            >
              Forgot password?
            </Text>
          </Pressable>

          <Button
            title="Sign In"
            onPress={handleLogin}
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
            New here?
          </Text>
          <Pressable onPress={() => router.push("/(auth)/signup" as never)}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.primary, fontWeight: "600" }}
            >
              Create an account
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
