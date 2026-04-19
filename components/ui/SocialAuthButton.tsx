import {
  StyleSheet,
  View,
  ViewStyle,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Text, useTheme } from "react-native-paper";
import { Image } from "expo-image";
import { FontAwesome } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";

type SocialProvider = "google" | "apple";

type SocialAuthButtonProps = {
  provider: SocialProvider;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function SocialAuthButton({
  provider,
  onPress,
  loading = false,
  disabled = false,
  style,
}: SocialAuthButtonProps) {
  const theme = useTheme();
  const isDark = theme.dark;

  // Google button uses official branded SVG images
  if (provider === "google") {
    if (loading) {
      return (
        <View style={[styles.button, styles.loadingContainer, style]}>
          <ActivityIndicator color={isDark ? "#E3E3E3" : "#1F1F1F"} />
        </View>
      );
    }

    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.button,
          disabled && styles.buttonDisabled,
          pressed && styles.buttonPressed,
          style,
        ]}
      >
        <Image
          source={
            isDark
              ? require("@/assets/google-signin-dark.svg")
              : require("@/assets/google-signin-light.svg")
          }
          style={styles.buttonImage}
          contentFit="contain"
        />
      </Pressable>
    );
  }

  // Apple button - use official component on iOS only
  if (Platform.OS === "ios") {
    if (loading) {
      return (
        <View style={[styles.button, styles.loadingContainer, style]}>
          <ActivityIndicator color={isDark ? "#000000" : "#FFFFFF"} />
        </View>
      );
    }

    return (
      <View style={[disabled && styles.buttonDisabled, style]}>
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={
            isDark
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={20}
          style={styles.button}
          onPress={onPress}
        />
      </View>
    );
  }

  // Web and Android - custom styled Apple button
  const backgroundColor = isDark ? "#FFFFFF" : "#000000";
  const textColor = isDark ? "#000000" : "#FFFFFF";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.appleButtonCustom,
        {
          backgroundColor,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <View style={styles.appleContent}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={textColor}
            style={styles.icon}
          />
        ) : (
          <FontAwesome
            name="apple"
            size={18}
            color={textColor}
            style={styles.icon}
          />
        )}
        <Text style={[styles.appleLabel, { color: textColor }]}>
          Sign in with Apple
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "center",
    height: 40,
    width: 175,
  },
  buttonImage: {
    width: "100%",
    height: "100%",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  appleButtonCustom: {
    alignSelf: "center",
    height: 40,
    width: 175,
    borderRadius: 20,
    justifyContent: "center",
  },
  appleContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: 8,
  },
  appleLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
});
