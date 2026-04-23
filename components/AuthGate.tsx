import { useAuth } from "@/contexts/AuthContext";
import { Redirect } from "expo-router";
import { ReactNode, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text, useTheme } from "react-native-paper";

type AuthGateProps = {
  children: ReactNode;
};

/**
 * Protects screens that require authentication.
 * Redirects to login if not authenticated.
 * Shows email verification screen for unverified email/password users.
 * Signs out non-admins and redirects to login with a reason message.
 */
export function AuthGate({ children }: AuthGateProps) {
  const { user, emailVerified, checkedAuthState, signOut } = useAuth();
  const theme = useTheme();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const wasNonAdminRef = useRef(false);

  useEffect(() => {
    if (!user || !emailVerified) {
      setIsAdmin(null);
      return;
    }

    let cancelled = false;
    user.getIdTokenResult().then((tokenResult) => {
      if (cancelled) return;
      if (tokenResult.claims.role === "admin") {
        setIsAdmin(true);
      } else {
        wasNonAdminRef.current = true;
        setIsAdmin(false);
        signOut();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user, emailVerified, signOut]);

  // Show loading while checking auth state
  if (!checkedAuthState) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    const href = wasNonAdminRef.current
      ? "/(auth)/login?reason=not-admin"
      : "/(auth)/login";
    return <Redirect href={href as never} />;
  }

  // Show verification screen for unverified email/password users
  if (!emailVerified) {
    return <EmailVerificationScreen />;
  }

  // Admin check pending or failed — hold on a spinner until the sign-out + redirect lands
  if (isAdmin !== true) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

function EmailVerificationScreen() {
  const { user, sendVerificationEmail, reloadUser, signOut } = useAuth();
  const theme = useTheme();
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleResend = async () => {
    setIsSending(true);
    setMessage("");
    try {
      await sendVerificationEmail();
      setIsError(false);
      setMessage("Verification email sent! Check your inbox.");
    } catch {
      setIsError(true);
      setMessage("Failed to send verification email. Try again later.");
    } finally {
      setIsSending(false);
    }
  };

  const handleCheckVerified = async () => {
    setIsChecking(true);
    setMessage("");
    try {
      await reloadUser();
    } catch {
      setIsError(true);
      setMessage("Could not check verification status. Try again.");
      setIsChecking(false);
      return;
    }
    setIsChecking(false);
    // If still not verified after reload, show message
    if (!user?.emailVerified) {
      setIsError(true);
      setMessage(
        "Email not verified yet. Please check your inbox and click the verification link."
      );
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <Text
          variant="headlineSmall"
          style={[styles.title, { color: theme.colors.onBackground }]}
        >
          Verify your email
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
        >
          We sent a verification email to:
        </Text>
        <Text
          variant="bodyLarge"
          style={[styles.email, { color: theme.colors.onBackground }]}
        >
          {user?.email}
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
        >
          Please click the link in the email to verify your account.
        </Text>

        {message !== "" && (
          <Text
            variant="bodySmall"
            style={[
              styles.message,
              { color: isError ? theme.colors.error : theme.colors.primary },
            ]}
          >
            {message}
          </Text>
        )}

        <Button
          mode="contained"
          onPress={handleCheckVerified}
          loading={isChecking}
          disabled={isChecking || isSending}
          style={styles.button}
        >
          I've verified my email
        </Button>
        <Button
          mode="outlined"
          onPress={handleResend}
          loading={isSending}
          disabled={isSending || isChecking}
          style={styles.button}
        >
          Resend verification email
        </Button>
        <Button
          mode="text"
          onPress={signOut}
          disabled={isSending || isChecking}
          style={styles.button}
        >
          Sign out
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingHorizontal: 32,
    maxWidth: 400,
    width: "100%",
    alignItems: "center",
  },
  title: {
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 4,
  },
  email: {
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    textAlign: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  button: {
    marginTop: 12,
    width: "100%",
  },
});
