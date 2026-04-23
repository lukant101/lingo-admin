import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

export type LanguageSelection = { code: string; name: string };

const STORAGE_KEY = "admin.selectedLanguage";

export const DEFAULT_LANGUAGE: LanguageSelection = {
  code: "en-ca",
  name: "English (Canadian)",
};

export function useSelectedLanguage() {
  const [lang, setLangState] = useState<LanguageSelection | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as LanguageSelection;
            if (parsed?.code && parsed?.name) {
              setLangState(parsed);
              return;
            }
          } catch {
            // fall through to default
          }
        }
        setLangState(DEFAULT_LANGUAGE);
      })
      .catch(() => {
        if (!cancelled) setLangState(DEFAULT_LANGUAGE);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLang = useCallback((next: LanguageSelection) => {
    setLangState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((err) => {
      console.warn("Failed to persist selected language:", err);
    });
  }, []);

  return { lang, setLang };
}
