import {
  MD3Theme,
  MD3LightTheme,
  MD3DarkTheme,
  configureFonts,
} from "react-native-paper";

const colorPalette = require("../assets/colors/copper-brown.json");

export const FONTS = {
  regular: "NotoSans_400Regular",
  regularItalic: "NotoSans_400Regular_Italic",
  medium: "NotoSans_500Medium",
  bold: "NotoSans_700Bold",
} as const;

export type FontFamily = (typeof FONTS)[keyof typeof FONTS];

export const COLORS = {
  SUCCESS_GREEN: "#4CAF50",
  ERROR_RED: "#F44336",
  EURO_BLUE: "#1A3CC7",
} as const;

// MD3 typescale font configuration
const fontConfig = {
  default: {
    fontFamily: FONTS.regular,
    fontWeight: "400" as const,
  },
  displayLarge: { fontFamily: FONTS.regular, fontWeight: "400" as const },
  displayMedium: { fontFamily: FONTS.regular, fontWeight: "400" as const },
  displaySmall: { fontFamily: FONTS.regular, fontWeight: "400" as const },
  headlineLarge: { fontFamily: FONTS.regular, fontWeight: "400" as const },
  headlineMedium: { fontFamily: FONTS.regular, fontWeight: "400" as const },
  headlineSmall: { fontFamily: FONTS.regular, fontWeight: "400" as const },
  titleLarge: { fontFamily: FONTS.medium, fontWeight: "500" as const },
  titleMedium: { fontFamily: FONTS.medium, fontWeight: "500" as const },
  titleSmall: { fontFamily: FONTS.medium, fontWeight: "500" as const },
  labelLarge: { fontFamily: FONTS.medium, fontWeight: "500" as const },
  labelMedium: { fontFamily: FONTS.medium, fontWeight: "500" as const },
  labelSmall: { fontFamily: FONTS.medium, fontWeight: "500" as const },
  bodyLarge: { fontFamily: FONTS.regular, fontWeight: "400" as const },
  bodyMedium: { fontFamily: FONTS.regular, fontWeight: "400" as const },
  bodySmall: { fontFamily: FONTS.regular, fontWeight: "400" as const },
};

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...colorPalette.light.colors,
  },
  fonts: configureFonts({ config: fontConfig }),
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...colorPalette.dark.colors,
  },
  fonts: configureFonts({ config: fontConfig }),
};
