import { useRef } from "react";
import { COLORS } from "@/constants/theme";
import { Snackbar, useTheme } from "react-native-paper";

export type SnackbarState = {
  message: string;
  type: "success" | "error";
} | null;

type StyledSnackbarProps = {
  snackbar: SnackbarState;
  onDismiss: () => void;
  duration?: number;
};

export function StyledSnackbar({
  snackbar,
  onDismiss,
  duration = 5000,
}: StyledSnackbarProps) {
  const theme = useTheme();
  // Keep last non-null state so styling stays consistent during exit animation
  const lastRef = useRef(snackbar);
  if (snackbar) lastRef.current = snackbar;
  const display = snackbar ?? lastRef.current;

  return (
    <Snackbar
      visible={snackbar !== null}
      onDismiss={onDismiss}
      duration={duration}
      style={{
        backgroundColor:
          display?.type === "success"
            ? COLORS.SUCCESS_GREEN
            : theme.colors.errorContainer,
      }}
      theme={{
        ...theme,
        colors: {
          ...theme.colors,
          inverseOnSurface:
            display?.type === "success"
              ? "#1b1b1b"
              : theme.colors.onErrorContainer,
        },
      }}
      action={{
        label: display?.type === "success" ? "OK" : "Dismiss",
        textColor:
          display?.type === "success"
            ? "#1b1b1b"
            : theme.colors.onErrorContainer,
      }}
    >
      {display?.message}
    </Snackbar>
  );
}
