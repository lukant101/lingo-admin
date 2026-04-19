import { ViewStyle, StyleSheet } from "react-native";
import { Card as PaperCard } from "react-native-paper";

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  mode?: "outlined" | "elevated" | "contained";
};

export function Card({ children, style, mode = "outlined" }: CardProps) {
  return (
    <PaperCard style={[styles.card, style]} mode={mode}>
      <PaperCard.Content>{children}</PaperCard.Content>
    </PaperCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
  },
});
