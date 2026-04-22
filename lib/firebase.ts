import AsyncStorage from "@react-native-async-storage/async-storage";
import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import {
  AppCheck,
  getToken,
  initializeAppCheck,
  ReCaptchaV3Provider,
} from "firebase/app-check";
import {
  Auth,
  browserLocalPersistence,
  getAuth,
  // @ts-expect-error - getReactNativePersistence is exported from the React Native bundle only
  getReactNativePersistence,
  initializeAuth,
  setPersistence,
} from "firebase/auth";
import { Platform } from "react-native";

// Firebase configuration — shared with lingo-mates so Mates users can sign in.
const firebaseConfig = {
  apiKey: "AIzaSyDG9ReFpkLuzhPvPEmMGWmFfGGPNS0kp7g",
  authDomain: "lingo-mates.firebaseapp.com",
  projectId: "lingo-mates",
  storageBucket: "lingo-mates.firebasestorage.app",
  messagingSenderId: "88463646557",
  appId: "1:88463646557:web:2e93571faa57aa41d052b4",
  measurementId: "G-6S0MWWWQWW",
};

const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

function getFirebaseAuth(): Auth {
  if (Platform.OS === "web") {
    const webAuth = getAuth(app);
    setPersistence(webAuth, browserLocalPersistence).catch(() => {});
    return webAuth;
  }
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

const auth: Auth = getFirebaseAuth();

const RECAPTCHA_SITE_KEY =
  process.env.EXPO_PUBLIC_FIREBASE_RECAPTCHA_SITE_KEY ?? "";

let appCheck: AppCheck | null = null;

if (Platform.OS === "web" && typeof document !== "undefined") {
  // In dev, tell Firebase to mint a debug token instead of calling reCAPTCHA.
  // The token is printed to the browser console on first load; paste it into
  // Firebase Console → App Check → Apps → (web app) → Manage debug tokens.
  if (__DEV__) {
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean })
      .FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  if (RECAPTCHA_SITE_KEY || __DEV__) {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(
        RECAPTCHA_SITE_KEY || "debug-placeholder"
      ),
      isTokenAutoRefreshEnabled: true,
    });
  }
}

async function getAppCheckToken(): Promise<string> {
  if (!appCheck) return "";
  try {
    const result = await getToken(appCheck);
    return result.token;
  } catch {
    return "";
  }
}

export { app, auth, getAppCheckToken };
