import { COLORS } from "@/constants/theme";
import { getVariantName } from "@/lib/languages";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

const LOGO_SIZE = 44;

type StudioCardProps = {
  name: string;
  level: string;
  logoUrl?: string | null;
  langVariantCode?: string;
  isForSale?: boolean;
  onPress: () => void;
  action?: "navigate" | "edit";
};

export function StudioCard({
  name,
  level,
  logoUrl,
  langVariantCode,
  isForSale,
  onPress,
  action = "navigate",
}: StudioCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed
            ? theme.colors.surfaceVariant
            : theme.colors.surface,
        },
      ]}
    >
      {logoUrl ? (
        <Image
          source={{ uri: logoUrl }}
          style={[styles.logo, { borderColor: theme.colors.outlineVariant }]}
        />
      ) : (
        <View
          style={[
            styles.logo,
            styles.logoPlaceholder,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <FontAwesome
            name="image"
            size={20}
            color={theme.colors.onSurfaceVariant}
          />
        </View>
      )}
      <View style={styles.info}>
        <Text variant="titleMedium">{name}</Text>
        <View style={styles.subtitleRow}>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {langVariantCode
              ? `${getVariantName(langVariantCode)} · ${level}`
              : `Level ${level}`}
          </Text>
          {isForSale && (
            <MaterialCommunityIcons
              name="currency-eur"
              size={18}
              color={COLORS.EURO_BLUE}
            />
          )}
        </View>
      </View>
      <FontAwesome
        name={action === "edit" ? "pencil" : "chevron-right"}
        size={18}
        color={theme.colors.onSurfaceVariant}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  logoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 4,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
