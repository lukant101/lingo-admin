import { View, StyleSheet } from "react-native";
import { ProgressBar, Text, useTheme } from "react-native-paper";

type UploadProgressBarProps = {
  progress: number;
  label?: string;
};

export function UploadProgressBar({ progress, label }: UploadProgressBarProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {label && (
        <Text
          variant="labelSmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {label}
        </Text>
      )}
      <ProgressBar
        progress={progress}
        color={theme.colors.primary}
        style={styles.bar}
      />
      <Text
        variant="labelSmall"
        style={[styles.percentage, { color: theme.colors.onSurfaceVariant }]}
      >
        {Math.round(progress * 100)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  bar: {
    height: 4,
    borderRadius: 2,
  },
  percentage: {
    textAlign: "right",
  },
});
