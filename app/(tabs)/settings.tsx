import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { DIALOG_MAX_WIDTH } from "@/lib/constants";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Constants from "expo-constants";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Dialog,
  Button as PaperButton,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";

export default function SettingsScreen() {
  const { user, signOut, isLoading } = useAuth();
  const theme = useTheme();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  const handleSignOut = () => {
    signOut();
    setShowSignOutDialog(false);
    // No manual navigation - AuthGate handles redirect when user becomes null
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Card style={styles.card}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FontAwesome name="user" size={20} color={theme.colors.primary} />
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface, marginLeft: 8 }}
            >
              Account
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Email
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurface }}
            >
              {user?.email}
            </Text>
          </View>
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FontAwesome
              name="info-circle"
              size={20}
              color={theme.colors.primary}
            />
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface, marginLeft: 8 }}
            >
              About
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              App Version
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurface }}
            >
              {Constants.expoConfig?.version ?? ""}
              {process.env.EXPO_PUBLIC_GIT_SHA
                ? ` (${process.env.EXPO_PUBLIC_GIT_SHA})`
                : ""}
            </Text>
          </View>
        </View>
      </Card>

      <Button
        title="Sign Out"
        variant="outline"
        onPress={() => setShowSignOutDialog(true)}
        loading={isLoading}
        style={styles.signOutButton}
      />

      <Portal>
        <Dialog
          visible={showSignOutDialog}
          onDismiss={() => setShowSignOutDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title>Sign Out</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Are you sure you want to sign out?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <PaperButton onPress={() => setShowSignOutDialog(false)}>
              Cancel
            </PaperButton>
            <PaperButton onPress={handleSignOut}>Sign Out</PaperButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mono: {
    fontFamily: "monospace",
    maxWidth: "60%",
  },
  signOutButton: {
    marginTop: 8,
  },
  dialog: {
    maxWidth: DIALOG_MAX_WIDTH,
    marginHorizontal: "auto",
  },
});
