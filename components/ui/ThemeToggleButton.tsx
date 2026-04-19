import { IconButton, useTheme } from "react-native-paper";
import { useThemeContext } from "@/contexts/ThemeContext";

type ThemeToggleButtonProps = {
  style?: object;
};

export function ThemeToggleButton({ style }: ThemeToggleButtonProps) {
  const { themePreference, setThemePreference } = useThemeContext();
  const theme = useTheme();

  const cycleTheme = () => {
    if (themePreference === "light") {
      setThemePreference("dark");
    } else if (themePreference === "dark") {
      setThemePreference("system");
    } else {
      setThemePreference("light");
    }
  };

  const icon =
    themePreference === "light"
      ? "weather-sunny"
      : themePreference === "dark"
        ? "weather-night"
        : "theme-light-dark";

  return (
    <IconButton
      icon={icon}
      iconColor={theme.colors.onSurfaceVariant}
      size={24}
      onPress={cycleTheme}
      style={style}
    />
  );
}
