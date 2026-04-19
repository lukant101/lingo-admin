import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemePreference = "light" | "dark" | "system";
type ColorScheme = "light" | "dark";

type ThemeContextType = {
  themePreference: ThemePreference;
  colorScheme: ColorScheme;
  setThemePreference: (preference: ThemePreference) => void;
};

const STORAGE_KEY = "theme-preference";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [themePreference, setThemePreferenceState] =
    useState<ThemePreference>("system");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === "light" || value === "dark" || value === "system") {
        setThemePreferenceState(value);
      }
      setIsLoaded(true);
    });
  }, []);

  const setThemePreference = (preference: ThemePreference) => {
    setThemePreferenceState(preference);
    AsyncStorage.setItem(STORAGE_KEY, preference);
  };

  const colorScheme: ColorScheme =
    themePreference === "system"
      ? (systemColorScheme ?? "light")
      : themePreference;

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{ themePreference, colorScheme, setThemePreference }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
}
