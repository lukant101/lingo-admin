import LanguageSearch from "@/components/LanguageSearch";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  StyledSnackbar,
  type SnackbarState,
} from "@/components/ui/StyledSnackbar";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatorAccount } from "@/contexts/CreatorAccountContext";
import { submitCreatorApplication } from "@/lib/api/creator";
import type { CreatorApplicationFormData } from "@/types/creator";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { RadioButton, Text, useTheme } from "react-native-paper";

export default function CreatorApplicationScreen() {
  const { user } = useAuth();
  const { refreshCreatorAccount } = useCreatorAccount();
  const theme = useTheme();

  const [loading, setLoading] = useState(false);
  const [publishesOnline, setPublishesOnline] = useState<boolean | null>(null);
  const [canRegisterStripe, setCanRegisterStripe] = useState<boolean | null>(
    null
  );
  const [isAdult, setIsAdult] = useState<boolean | null>(null);
  const [formData, setFormData] = useState({
    legalName: "",
    contentLinks: [""],
    videoDescription: "",
    languageCode: "",
    language: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  const isFormComplete = useMemo(() => {
    if (!formData.legalName.trim()) return false;
    if (!formData.languageCode) return false;
    if (publishesOnline === null) return false;
    if (publishesOnline) {
      const validLinks = formData.contentLinks.filter((l) => l.trim());
      if (validLinks.length === 0) return false;
    }
    const descLen = formData.videoDescription.trim().length;
    if (descLen < 50 || descLen > 500) return false;
    if (!canRegisterStripe) return false;
    if (!isAdult) return false;
    return true;
  }, [formData, publishesOnline, canRegisterStripe, isAdult]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.legalName.trim()) {
      newErrors.legalName = "Legal name is required";
    }

    if (!formData.videoDescription.trim()) {
      newErrors.videoDescription = "Video description is required";
    } else if (formData.videoDescription.length < 50) {
      newErrors.videoDescription = "Description must be at least 50 characters";
    } else if (formData.videoDescription.length > 500) {
      newErrors.videoDescription =
        "Description must be less than 500 characters";
    }

    if (!formData.languageCode) {
      newErrors.language = "Language is required";
    }

    if (publishesOnline === null) {
      newErrors.publishesOnline = "Please select Yes or No";
    }

    const validLinks = formData.contentLinks.filter((link) => link.trim());
    if (validLinks.length === 0 && publishesOnline) {
      newErrors.contentLinks = "At least one content link is required";
    }

    if (canRegisterStripe === null) {
      newErrors.canRegisterStripe = "Please select Yes or No";
    } else if (!canRegisterStripe) {
      newErrors.canRegisterStripe =
        "You must be able to register with Stripe to proceed";
    }

    if (isAdult === null) {
      newErrors.isAdult = "Please select Yes or No";
    } else if (!isAdult) {
      newErrors.isAdult =
        "You must be at least 18 years old to become a creator";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setSnackbar(null);
    try {
      const validLinks = formData.contentLinks.filter((link) => link.trim());
      const payload: CreatorApplicationFormData = {
        ...formData,
        contentLinks: validLinks,
        publishesOnline: publishesOnline!,
        canRegisterStripe: canRegisterStripe!,
        isAdult: isAdult!,
      };
      await submitCreatorApplication(payload);
      await refreshCreatorAccount();
      router.replace("/creator/application/status");
    } catch {
      setSnackbar({
        message: "Something went wrong. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (lang: { code: string; name: string }) => {
    setFormData({
      ...formData,
      languageCode: lang.code,
      language: lang.name,
    });
  };

  const updateContentLink = (index: number, value: string) => {
    const newLinks = [...formData.contentLinks];
    newLinks[index] = value;
    setFormData({ ...formData, contentLinks: newLinks });
  };

  const addContentLink = () => {
    if (formData.contentLinks.length < 6) {
      setFormData({
        ...formData,
        contentLinks: [...formData.contentLinks, ""],
      });
    }
  };

  const removeContentLink = (index: number) => {
    if (formData.contentLinks.length > 1) {
      const newLinks = formData.contentLinks.filter((_, i) => i !== index);
      setFormData({ ...formData, contentLinks: newLinks });
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}
        >
          To learn more about creators on Lingo House, read our{" "}
          <Text
            variant="bodyMedium"
            style={{
              color: theme.colors.primary,
              textDecorationLine: "underline",
            }}
            onPress={() => Linking.openURL("https://lingohouse.app/creators")}
          >
            Become a Creator
          </Text>{" "}
          page, if you haven't done so.
        </Text>

        <Card style={styles.card} mode="elevated">
          <Text
            variant="titleLarge"
            style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
          >
            Creator Application
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginBottom: 24 }}
          >
            Fill out the form below to apply to become a Lingo House creator
          </Text>

          <Input
            label="Legal Name"
            value={formData.legalName}
            onChangeText={(text) =>
              setFormData({ ...formData, legalName: text })
            }
            placeholder="Your full legal name"
            error={errors.legalName}
          />

          <Input
            label="Email"
            value={user?.email ?? ""}
            editable={false}
            style={{ opacity: 0.7 }}
          />
          <Text
            variant="bodySmall"
            style={[
              styles.helperText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            This is your Lingo House account email
          </Text>

          <View
            style={[
              styles.divider,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />

          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
          >
            Language
          </Text>

          <LanguageSearch
            onSelect={handleLanguageChange}
            value={
              formData.languageCode
                ? { code: formData.languageCode, name: formData.language }
                : undefined
            }
            error={errors.language}
          />
          <Text
            variant="bodySmall"
            style={[
              styles.helperText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            You will be able to add other languages in the future, if your
            account remains in good standing
          </Text>

          <View
            style={[
              styles.divider,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />

          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
          >
            Your Content
          </Text>

          <Input
            label="Describe the video content you will produce"
            value={formData.videoDescription}
            onChangeText={(text) =>
              setFormData({ ...formData, videoDescription: text })
            }
            placeholder="Describe the topics, style, and approach of your video content..."
            multiline
            numberOfLines={4}
            error={errors.videoDescription}
          />
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Videos should be 1-3 minutes long
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, textAlign: "right" }}
          >
            {formData.videoDescription.length}/500 characters (min 50)
          </Text>

          <Text
            variant="bodyMedium"
            style={{
              color: theme.colors.onSurface,
              marginTop: 16,
              marginBottom: 4,
            }}
          >
            Do you currently publish content online?
          </Text>
          {errors.publishesOnline && (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.error, marginBottom: 4 }}
            >
              {errors.publishesOnline}
            </Text>
          )}
          <RadioButton.Group
            value={
              publishesOnline === null ? "" : publishesOnline ? "yes" : "no"
            }
            onValueChange={(val) => {
              const yes = val === "yes";
              setPublishesOnline(yes);
              if (!yes) {
                setFormData((prev) => ({ ...prev, contentLinks: [""] }));
              }
            }}
          >
            <View style={styles.radioRow}>
              <View style={styles.radioOption}>
                <RadioButton value="yes" />
                <Text
                  variant="bodyMedium"
                  onPress={() => setPublishesOnline(true)}
                >
                  Yes
                </Text>
              </View>
              <View style={styles.radioOption}>
                <RadioButton value="no" />
                <Text
                  variant="bodyMedium"
                  onPress={() => setPublishesOnline(false)}
                >
                  No
                </Text>
              </View>
            </View>
          </RadioButton.Group>

          {publishesOnline && (
            <View style={styles.linksSection}>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurface, marginBottom: 2 }}
              >
                Links to your online content
              </Text>
              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginTop: 8,
                  marginBottom: 8,
                }}
              >
                Add up to 6 links to your blog, YouTube channel, Instagram, etc.
              </Text>
              {formData.contentLinks.map((link, index) => (
                <View key={index} style={styles.linkRow}>
                  <Input
                    value={link}
                    onChangeText={(text) => updateContentLink(index, text)}
                    placeholder="https://..."
                    keyboardType="url"
                    autoCapitalize="none"
                    containerStyle={styles.linkInput}
                  />
                  {formData.contentLinks.length > 1 && (
                    <Button
                      title="Remove"
                      variant="outline"
                      onPress={() => removeContentLink(index)}
                      style={styles.removeButton}
                    />
                  )}
                </View>
              ))}
              {formData.contentLinks.length < 6 && (
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.primary, paddingVertical: 8 }}
                  onPress={addContentLink}
                >
                  + Add another link
                </Text>
              )}
              {errors.contentLinks && (
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.error, marginTop: 4 }}
                >
                  {errors.contentLinks}
                </Text>
              )}
            </View>
          )}

          <View
            style={[
              styles.divider,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />

          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurface, marginBottom: 4 }}
          >
            Are you 18 years of age or older?
          </Text>
          {errors.isAdult && (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.error, marginBottom: 4 }}
            >
              {errors.isAdult}
            </Text>
          )}
          <RadioButton.Group
            value={isAdult === null ? "" : isAdult ? "yes" : "no"}
            onValueChange={(val) => setIsAdult(val === "yes")}
          >
            <View style={styles.radioRow}>
              <View style={styles.radioOption}>
                <RadioButton value="yes" />
                <Text variant="bodyMedium" onPress={() => setIsAdult(true)}>
                  Yes
                </Text>
              </View>
              <View style={styles.radioOption}>
                <RadioButton value="no" />
                <Text variant="bodyMedium" onPress={() => setIsAdult(false)}>
                  No
                </Text>
              </View>
            </View>
          </RadioButton.Group>
          <Text
            variant="bodyMedium"
            style={[styles.noteText, { color: theme.colors.onSurfaceVariant }]}
          >
            You must be at least 18 years old to become a creator on Lingo
            House.
          </Text>

          <View
            style={[
              styles.divider,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />

          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurface, marginBottom: 4 }}
          >
            Can you register with Stripe in a{" "}
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.primary,
                textDecorationLine: "underline",
              }}
              onPress={() => Linking.openURL("https://stripe.com/en-ca/global")}
            >
              supported country
            </Text>
            ?
          </Text>
          {errors.canRegisterStripe && (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.error, marginBottom: 4 }}
            >
              {errors.canRegisterStripe}
            </Text>
          )}
          <RadioButton.Group
            value={
              canRegisterStripe === null ? "" : canRegisterStripe ? "yes" : "no"
            }
            onValueChange={(val) => setCanRegisterStripe(val === "yes")}
          >
            <View style={styles.radioRow}>
              <View style={styles.radioOption}>
                <RadioButton value="yes" />
                <Text
                  variant="bodyMedium"
                  onPress={() => setCanRegisterStripe(true)}
                >
                  Yes
                </Text>
              </View>
              <View style={styles.radioOption}>
                <RadioButton value="no" />
                <Text
                  variant="bodyMedium"
                  onPress={() => setCanRegisterStripe(false)}
                >
                  No
                </Text>
              </View>
            </View>
          </RadioButton.Group>
          <Text
            variant="bodyMedium"
            style={[styles.noteText, { color: theme.colors.onSurfaceVariant }]}
          >
            Note: We are not able to accept creators based in Brazil due to
            Brazilian regulatory and compliance requirements.
          </Text>

          <Button
            title="Submit Application"
            onPress={handleSubmit}
            loading={loading}
            disabled={!isFormComplete || loading}
            style={styles.submitButton}
          />
        </Card>
      </ScrollView>

      <StyledSnackbar
        snackbar={snackbar}
        onDismiss={() => setSnackbar(null)}
        duration={7000}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 8,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
  },
  helperText: {
    marginBottom: 8,
  },
  noteText: {
    marginTop: 4,
    fontStyle: "italic",
  },
  linksSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  linkInput: {
    flex: 1,
    marginRight: 8,
  },
  removeButton: {
    paddingHorizontal: 12,
    minHeight: 44,
  },
  addButton: {
    marginTop: 8,
  },
  submitButton: {
    marginTop: 24,
  },
});
