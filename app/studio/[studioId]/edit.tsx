import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import {
  StyledSnackbar,
  type SnackbarState,
} from "@/components/ui/StyledSnackbar";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatorAccount } from "@/contexts/CreatorAccountContext";
import { useMonetizationReadiness } from "@/hooks/useMonetizationReadiness";
import {
  getPriceLevels,
  getStudioSettings,
  updateStudioSettings,
} from "@/lib/api/studios";
import { listDecks } from "@/lib/api/submissions";
import { LOGO_SIZE, resizeForLogo } from "@/lib/imageProcessing";
import { getVariantName } from "@/lib/languages";
import { buildLogoPath, uploadFileToStorage } from "@/lib/storage";
import { validateFile } from "@/lib/uploadValidation";
import type { PriceLevel, StudioSettings } from "@/types/studio";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Switch, Text, useTheme } from "react-native-paper";

export default function StudioSettingsScreen() {
  const { studioId } = useLocalSearchParams<{ studioId: string }>();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { creatorAccount } = useCreatorAccount();
  const { monetizationReadiness } = useMonetizationReadiness();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<StudioSettings | null>(null);
  const [priceLevels, setPriceLevels] = useState<PriceLevel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isForSale, setIsForSale] = useState(false);
  const [priceLevelId, setPriceLevelId] = useState("");
  const [logoData, setLogoData] = useState<{
    uri: string;
    format: string;
  } | null>(null);
  const [featuredDeckCount, setFeaturedDeckCount] = useState(0);

  const fetchSettings = useCallback(async () => {
    if (!studioId) return;

    try {
      setError(null);
      const [data, levels, decksResult] = await Promise.all([
        getStudioSettings(studioId),
        getPriceLevels(),
        listDecks(studioId),
      ]);
      setSettings(data);
      setPriceLevels(levels);
      setFeaturedDeckCount(decksResult.data.filter((d) => d.isFeatured).length);
      setName(data.name);
      setDescription(data.description ?? "");
      setIsForSale(data.isForSale);
      setPriceLevelId(data.priceLevelId);
      setLogoData(null);
    } catch (err) {
      console.error("Error fetching studio settings:", err);
      setError("Failed to load studio settings");
    } finally {
      setLoading(false);
    }
  }, [studioId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSettings();
    setRefreshing(false);
  }, [fetchSettings]);

  const handleSave = async () => {
    if (!studioId || !settings) return;

    if (!name.trim()) {
      setSnackbar({ message: "Studio name is required", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const update: Parameters<typeof updateStudioSettings>[1] = {
        name: name.trim(),
        description: description.trim() || undefined,
        isForSale,
      };

      if (logoData) {
        const gcsPath = buildLogoPath(
          user!.uid,
          studioId,
          `logo.${logoData.format}`
        );
        const contentType = `image/${logoData.format}`;
        await uploadFileToStorage({
          localUri: logoData.uri,
          gcsPath,
          contentType,
        });
        update.logoStoragePath = gcsPath;
      }

      if (!settings.stripeProductId && priceLevelId !== settings.priceLevelId) {
        update.priceLevelId = priceLevelId;
      }

      await updateStudioSettings(studioId, update);
      setSnackbar({ message: "Studio settings updated", type: "success" });
      await fetchSettings();

      queryClient.invalidateQueries({ queryKey: ["studios"] });
      queryClient.invalidateQueries({ queryKey: ["studioSettings", studioId] });
    } catch (err) {
      console.error("Failed to save settings:", err);
      setSnackbar({
        message: "Failed to save settings. Please try again.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // isForSale validation
  const MIN_FEATURED_DECKS = 5;
  const creatorStatus = creatorAccount?.creatorStatus;
  const effectivePriceLevelId = priceLevelId || settings?.priceLevelId;

  const canToggleForSale =
    creatorStatus === "active" &&
    monetizationReadiness.canAcceptPayments &&
    featuredDeckCount >= MIN_FEATURED_DECKS &&
    !!effectivePriceLevelId;

  const isForSaleDisabledReason = (() => {
    if (creatorStatus === "banned" || creatorStatus === "suspended")
      return "You are not allowed to sell content.";
    if (creatorStatus !== "active")
      return "Your creator account is not currently active.";
    if (!monetizationReadiness.canAcceptPayments)
      return "Set up Stripe in Monetization settings to accept payments.";
    if (featuredDeckCount < MIN_FEATURED_DECKS)
      return `You have ${featuredDeckCount} featured deck${featuredDeckCount === 1 ? "" : "s"}. At least ${MIN_FEATURED_DECKS} are required.`;
    if (!effectivePriceLevelId)
      return "A price level must be set before enabling sales.";
    return null;
  })();

  // Price level selector
  const canEditPriceLevel = !settings?.stripeProductId;
  const creatorTier = creatorAccount?.creatorTier ?? "standard";
  const filteredPriceLevels = priceLevels
    .filter((pl) => pl.eligibleCreatorTiers.includes(creatorTier))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const singlePriceLevel =
    filteredPriceLevels.length === 1 ? filteredPriceLevels[0] : null;
  const priceLevelOptions = filteredPriceLevels.map((pl) => ({
    label: `${pl.subscriptionDisplayPrice}/month (${pl.oneTimeDisplayPrice} one-time)`,
    value: pl.id,
  }));

  // Logo picker
  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = asset.uri.split("/").pop() ?? null;
      const validationError = validateFile({
        category: "image",
        fileSize: asset.fileSize ?? null,
        mimeType: asset.mimeType ?? null,
        fileName,
      });
      if (validationError) {
        setSnackbar({ message: validationError, type: "error" });
        return;
      }

      const w = asset.width ?? 0;
      const h = asset.height ?? 0;
      if (w < LOGO_SIZE || h < LOGO_SIZE) {
        setSnackbar({
          message: `Image must be at least ${LOGO_SIZE}x${LOGO_SIZE}px (got ${w}x${h}).`,
          type: "error",
        });
        return;
      }

      const processed = await resizeForLogo(
        asset.uri,
        asset.width,
        asset.height,
        asset.mimeType
      );
      setLogoData(processed);
    }
  };

  const hasChanges =
    settings &&
    (name !== settings.name ||
      description !== (settings.description ?? "") ||
      isForSale !== settings.isForSale ||
      priceLevelId !== settings.priceLevelId ||
      logoData !== null);

  if (loading) {
    return <LoadingSpinner message="Loading studio settings..." />;
  }

  if (error || !settings) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <FontAwesome
          name="exclamation-circle"
          size={48}
          color={theme.colors.error}
        />
        <Text
          variant="titleMedium"
          style={[styles.errorTitle, { color: theme.colors.onBackground }]}
        >
          {error ?? "Studio not found"}
        </Text>
        <Button
          title="Back"
          variant="outline"
          onPress={() => router.back()}
          style={{ marginTop: 16 }}
        />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Card style={styles.card}>
          <View style={styles.headerRow}>
            <MaterialCommunityIcons
              name="palette"
              size={24}
              color={theme.colors.primary}
            />
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface, marginLeft: 10 }}
            >
              Edit Studio
            </Text>
          </View>

          <Input
            label="Studio Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter studio name"
            maxLength={100}
          />

          <Input
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your studio content"
            multiline
            numberOfLines={4}
            maxLength={600}
          />

          <View style={styles.infoRow}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Language
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurface }}
            >
              {getVariantName(settings.langVariantCode)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Level
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurface }}
            >
              {settings.level}
            </Text>
          </View>

          <View style={styles.logoSection}>
            <Text
              variant="labelMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Logo (512x512)
            </Text>
            {logoData || settings.logoUrl ? (
              <Image
                source={{ uri: logoData?.uri ?? settings.logoUrl! }}
                style={styles.logoPreview}
              />
            ) : null}
            <Button
              title={
                logoData || settings.logoUrl ? "Change Logo" : "Choose Logo"
              }
              onPress={pickLogo}
              variant="outline"
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.headerRow}>
            <FontAwesome name="dollar" size={24} color={theme.colors.primary} />
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface, marginLeft: 10 }}
            >
              Pricing & Availability
            </Text>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabelContainer}>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurface }}
              >
                Available for Purchase
              </Text>
              {isForSaleDisabledReason && (
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.error, marginTop: 4 }}
                >
                  {isForSaleDisabledReason}
                </Text>
              )}
            </View>
            <Switch
              value={isForSale}
              onValueChange={(val) => {
                if (val && !canToggleForSale) return;
                setIsForSale(val);
              }}
              disabled={!canToggleForSale && !isForSale}
            />
          </View>

          <View
            style={[
              styles.priceInfo,
              { borderTopColor: theme.colors.outlineVariant },
            ]}
          >
            {canEditPriceLevel && !singlePriceLevel ? (
              <Select
                label="Price Level"
                options={priceLevelOptions}
                value={priceLevelId}
                onValueChange={setPriceLevelId}
                placeholder="Select a price level"
              />
            ) : (
              (() => {
                const priceLevel = priceLevels.find(
                  (p) => p.id === settings.priceLevelId
                );
                return priceLevel ? (
                  <>
                    <View style={styles.priceRow}>
                      <Text
                        variant="bodyMedium"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        Subscription Price
                      </Text>
                      <Text
                        variant="bodyMedium"
                        style={{
                          color: theme.colors.onSurface,
                          fontWeight: "600",
                        }}
                      >
                        {priceLevel.subscriptionDisplayPrice}/month
                      </Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text
                        variant="bodyMedium"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        One-time Price
                      </Text>
                      <Text
                        variant="bodyMedium"
                        style={{
                          color: theme.colors.onSurface,
                          fontWeight: "600",
                        }}
                      >
                        {priceLevel.oneTimeDisplayPrice}
                      </Text>
                    </View>
                    {!canEditPriceLevel && (
                      <Text
                        variant="bodySmall"
                        style={{
                          color: theme.colors.onSurfaceVariant,
                          marginTop: 12,
                          fontStyle: "italic",
                        }}
                      >
                        Price cannot be changed once published.
                      </Text>
                    )}
                  </>
                ) : (
                  <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    Pricing information unavailable
                  </Text>
                );
              })()
            )}
          </View>
        </Card>

        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={saving}
          disabled={!hasChanges}
          style={styles.saveButton}
        />

        <Button
          title="Back"
          variant="outline"
          onPress={() => router.back()}
          style={styles.cancelButton}
        />
      </ScrollView>

      <StyledSnackbar snackbar={snackbar} onDismiss={() => setSnackbar(null)} />
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
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  logoSection: {
    gap: 12,
    paddingTop: 8,
  },
  logoPreview: {
    width: 128,
    height: 128,
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  priceInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  saveButton: {
    marginTop: 8,
  },
  cancelButton: {
    marginTop: 24,
  },
  errorTitle: {
    marginTop: 16,
  },
});
