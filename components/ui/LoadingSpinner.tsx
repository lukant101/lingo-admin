import { View, StyleSheet } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";

type LoadingSpinnerProps = {
  message?: string;
  size?: "small" | "large";
};

export function LoadingSpinner({
  message,
  size = "large",
}: LoadingSpinnerProps) {
  const theme = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ActivityIndicator size={size} color={theme.colors.primary} />
      {message && (
        <Text
          variant="bodyMedium"
          style={[styles.message, { color: theme.colors.onSurfaceVariant }]}
        >
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  message: {
    marginTop: 12,
  },
});
