import { ViewStyle, StyleSheet } from "react-native";
import { Button as PaperButton, useTheme } from "react-native-paper";

type ButtonVariant = "primary" | "secondary" | "outline" | "danger";

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  style?: ViewStyle;
};

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  icon,
  style,
}: ButtonProps) {
  const theme = useTheme();

  const getMode = (): "contained" | "contained-tonal" | "outlined" => {
    switch (variant) {
      case "primary":
      case "danger":
        return "contained";
      case "secondary":
        return "contained-tonal";
      case "outline":
        return "outlined";
      default:
        return "contained";
    }
  };

  const getButtonColor = () => {
    if (variant === "danger") {
      return theme.colors.error;
    }
    return undefined;
  };

  const getTextColor = () => {
    if (variant === "danger") {
      return theme.colors.onError;
    }
    return undefined;
  };

  return (
    <PaperButton
      mode={getMode()}
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      icon={icon}
      style={[styles.button, style]}
      contentStyle={styles.content}
      buttonColor={getButtonColor()}
      textColor={getTextColor()}
    >
      {title}
    </PaperButton>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  content: {
    paddingVertical: 6,
  },
});
