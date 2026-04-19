import * as Linking from "expo-linking";

/**
 * Deep link URL scheme for the app
 */
export const URL_SCHEME = "lingoadmin";

/**
 * Create a deep link URL
 */
export function createDeepLink(path: string): string {
  return Linking.createURL(path);
}

/**
 * Parse a deep link URL
 */
export function parseDeepLink(url: string): Linking.ParsedURL {
  return Linking.parse(url);
}

/**
 * Linking configuration for expo-router
 * This is used to configure how the app handles deep links
 */
export const linking = {
  prefixes: [`${URL_SCHEME}://`],
  config: {
    screens: {
      "(tabs)": {
        screens: {
          index: "",
          sales: "sales",
          settings: "settings",
        },
      },
      "(auth)": {
        screens: {
          login: "login",
        },
      },
      "creator/application": "creator/application",
      "creator/status": "creator/status",
      "monetization/index": "monetization",
      "monetization/onboarding-refresh": "monetization/onboarding-refresh",
      "studio/[studioId]/settings": "studio/:studioId/settings",
    },
  },
};

/**
 * Deep link paths for Stripe onboarding URLs
 */
export const STRIPE_ONBOARDING_PATHS = {
  return: "monetization",
  refresh: "monetization/onboarding-refresh",
} as const;

/**
 * Get the full deep link URL for Stripe onboarding callbacks
 */
export function getStripeOnboardingDeepLink(
  type: keyof typeof STRIPE_ONBOARDING_PATHS
): string {
  return `${URL_SCHEME}://${STRIPE_ONBOARDING_PATHS[type]}`;
}
