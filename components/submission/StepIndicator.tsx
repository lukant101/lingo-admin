import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

type StepIndicatorProps = {
  currentStep: number;
  completedSteps: number;
  labels: string[];
};

export function StepIndicator({
  currentStep,
  completedSteps,
  labels,
}: StepIndicatorProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {labels.map((label, i) => {
          const step = i + 1;
          const isCompleted = step <= completedSteps && step !== currentStep;
          const isCurrent = step === currentStep;

          let circleBg: string;
          let borderColor: string;
          let textColor: string;

          if (isCompleted || isCurrent) {
            circleBg = theme.colors.primary;
            borderColor = theme.colors.primary;
            textColor = theme.colors.onPrimary;
          } else {
            circleBg = theme.colors.background;
            borderColor = theme.colors.outlineVariant;
            textColor = theme.colors.onSurfaceVariant;
          }

          const labelColor = isCurrent
            ? theme.colors.primary
            : theme.colors.onSurfaceVariant;

          // Left half-line: colored if this step has been reached
          const leftLineColor =
            i > 0
              ? step <= completedSteps + 1
                ? theme.colors.primary
                : theme.colors.outlineVariant
              : undefined;

          // Right half-line: colored if next step has been reached
          const rightLineColor =
            i < labels.length - 1
              ? step + 1 <= completedSteps + 1
                ? theme.colors.primary
                : theme.colors.outlineVariant
              : undefined;

          return (
            <View key={step} style={styles.stepColumn}>
              <View style={styles.circleRow}>
                <View
                  style={[
                    styles.lineHalf,
                    leftLineColor != null && { backgroundColor: leftLineColor },
                  ]}
                />
                <View
                  style={[
                    styles.circle,
                    { backgroundColor: circleBg, borderColor },
                  ]}
                >
                  {isCompleted ? (
                    <MaterialCommunityIcons
                      name="check"
                      size={14}
                      color={textColor}
                    />
                  ) : (
                    <Text
                      variant="labelSmall"
                      style={{ color: textColor, fontSize: 11 }}
                    >
                      {step}
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.lineHalf,
                    rightLineColor != null && {
                      backgroundColor: rightLineColor,
                    },
                  ]}
                />
              </View>
              <Text
                variant="labelSmall"
                style={[styles.label, { color: labelColor }]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
  },
  stepColumn: {
    flex: 1,
    alignItems: "center",
  },
  circleRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  lineHalf: {
    flex: 1,
    height: 2,
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginTop: 4,
    fontSize: 10,
    textAlign: "center",
  },
});
