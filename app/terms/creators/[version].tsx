import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getAgreementContent } from "@/lib/api/monetization";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Divider, Text, useTheme } from "react-native-paper";
import Markdown from "react-native-markdown-display";

export default function CreatorAgreementPage() {
  const { version } = useLocalSearchParams<{ version: string }>();
  const theme = useTheme();

  const [title, setTitle] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!version) return;
    getAgreementContent(version)
      .then((doc) => {
        setTitle(doc.title);
        setContent(doc.content);
      })
      .catch(() => {
        setError("Failed to load the Creator Agreement.");
      });
  }, [version]);

  if (error) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text
          variant="bodyLarge"
          style={{ color: theme.colors.error, textAlign: "center" }}
        >
          {error}
        </Text>
      </View>
    );
  }

  if (!content) {
    return <LoadingSpinner message="Loading agreement..." />;
  }

  const markdownStyles = {
    body: {
      color: theme.colors.onBackground,
      fontSize: 17,
      lineHeight: 29,
    },
    heading1: {
      color: theme.colors.onBackground,
      fontSize: 28,
      fontWeight: "700" as const,
      marginBottom: 16,
      marginTop: 24,
    },
    heading2: {
      color: theme.colors.onBackground,
      fontSize: 20,
      fontWeight: "700" as const,
      marginBottom: 16,
      marginTop: 24,
    },
    heading3: {
      color: theme.colors.onBackground,
      fontSize: 17,
      fontWeight: "600" as const,
      marginBottom: 8,
      marginTop: 20,
    },
    paragraph: {
      marginBottom: 16,
    },
    link: {
      color: theme.colors.primary,
    },
    list_item: {
      marginBottom: 8,
    },
    hr: {
      backgroundColor: theme.colors.outlineVariant,
      height: 1,
      marginVertical: 24,
    },
    strong: {
      fontWeight: "700" as const,
    },
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {title && (
          <Text
            variant="headlineMedium"
            style={{
              color: theme.colors.onBackground,
              fontWeight: "700",
              marginBottom: 4,
            }}
          >
            {title}
          </Text>
        )}
        {version && (
          <Text
            variant="bodyLarge"
            style={{
              color: theme.colors.onSurfaceVariant,
              marginTop: 8,
            }}
          >
            Last updated: {version}
          </Text>
        )}
        <Divider style={{ marginTop: 30 }} />
        <Markdown style={markdownStyles}>{content}</Markdown>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    padding: 20,
    paddingTop: 48,
    paddingBottom: 48,
  },
});
