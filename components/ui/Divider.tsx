import { StyleSheet, View, ViewStyle } from "react-native";
import { Text, useTheme } from "react-native-paper";

type DividerProps = {
  text?: string;
  style?: ViewStyle;
};

export function Divider({ text = "or", style }: DividerProps) {
  const theme = useTheme();
  const lineColor = theme.dark ? "#3A3A3C" : "#E0E0E0";

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.line, { backgroundColor: lineColor }]} />
      <Text style={[styles.text, { color: theme.colors.onSurfaceVariant }]}>
        {text}
      </Text>
      <View style={[styles.line, { backgroundColor: lineColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
  },
  text: {
    marginHorizontal: 16,
    fontSize: 14,
  },
});
