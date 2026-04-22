import {
  NotoSans_400Regular,
  NotoSans_400Regular_Italic,
  NotoSans_500Medium,
  NotoSans_700Bold,
  useFonts,
} from "@expo-google-fonts/noto-sans";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import { PaperProvider } from "react-native-paper";
import "react-native-reanimated";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { darkTheme, lightTheme } from "@/constants/theme";
import { AuthProvider } from "@/contexts/AuthContext";
import { CreatorAccountProvider } from "@/contexts/CreatorAccountContext";
import {
  ThemeProvider as AppThemeProvider,
  useThemeContext,
} from "@/contexts/ThemeContext";
import { loadLanguages } from "@/lib/languages";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)",
};

// On web, force useNativeDriver: false to prevent warnings from dependencies
if (Platform.OS === "web") {
  const origTiming = Animated.timing;
  (Animated as any).timing = (value: any, config: any) =>
    origTiming(value, { ...config, useNativeDriver: false });

  const origSpring = Animated.spring;
  (Animated as any).spring = (value: any, config: any) =>
    origSpring(value, { ...config, useNativeDriver: false });

  const origDecay = Animated.decay;
  (Animated as any).decay = (value: any, config: any) =>
    origDecay(value, { ...config, useNativeDriver: false });
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Create a client
const queryClient = new QueryClient();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSans_400Regular,
    NotoSans_400Regular_Italic,
    NotoSans_500Medium,
    NotoSans_700Bold,
    ...FontAwesome.font,
    ...MaterialCommunityIcons.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    loadLanguages();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppThemeProvider>
          <AuthProvider>
            <CreatorAccountProvider>
              <RootLayoutNav />
            </CreatorAccountProvider>
          </AuthProvider>
        </AppThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  const { colorScheme } = useThemeContext();
  const paperTheme = colorScheme === "dark" ? darkTheme : lightTheme;
  const backgroundColor = paperTheme.colors.background;
  const insets = useSafeAreaInsets();

  const safeAreaStyle = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  const navigationTheme = {
    dark: colorScheme === "dark",
    colors: {
      primary: paperTheme.colors.primary,
      background: paperTheme.colors.background,
      card: paperTheme.colors.background,
      text: paperTheme.colors.onSurface,
      border: paperTheme.colors.outline,
      notification: paperTheme.colors.error,
    },
    fonts: colorScheme === "dark" ? DarkTheme.fonts : DefaultTheme.fonts,
  };

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={navigationTheme}>
        <View style={[styles.webContainer, { backgroundColor }, safeAreaStyle]}>
          <View style={styles.webContent}>
            <Stack>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="creator/application/index"
                options={{
                  title: "Creator Application",
                  presentation: "modal",
                }}
              />
              <Stack.Screen
                name="creator/application/status"
                options={{ title: "Application Status" }}
              />
              <Stack.Screen
                name="monetization/index"
                options={{ title: "Monetization" }}
              />
              <Stack.Screen
                name="monetization/onboarding-refresh"
                options={{ title: "Stripe Setup", presentation: "modal" }}
              />
              <Stack.Screen
                name="studio/new"
                options={{ title: "Create Studio" }}
              />
              <Stack.Screen
                name="studio/[studioId]/edit"
                options={{ title: "Edit Studio" }}
              />
              <Stack.Screen
                name="studio/[studioId]/decks/[deckId]/edit"
                options={{ title: "Edit Deck" }}
              />
              <Stack.Screen
                name="studios/[studioId]"
                options={{ title: "Studio" }}
              />
              <Stack.Screen
                name="admin"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="terms/creators/[version]"
                options={{ title: "Creator Agreement", headerShown: false }}
              />
              <Stack.Screen name="modal" options={{ presentation: "modal" }} />
            </Stack>
          </View>
        </View>
      </ThemeProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    alignItems: Platform.OS === "web" ? "center" : undefined,
  },
  webContent: {
    flex: 1,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 800 : undefined,
  },
});
