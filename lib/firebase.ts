import AsyncStorage from "@react-native-async-storage/async-storage";
import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import {
  AppCheck,
  initializeAppCheck,
  ReCaptchaV3Provider,
  getToken,
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
  apiKey: "AIzaSyCcaxnxBTfaT2IZkY2gbhvQ0jec8R1olUg",
  authDomain: "lingo-mates.firebaseapp.com",
  projectId: "lingo-mates",
  storageBucket: "lingo-mates.firebasestorage.app",
  messagingSenderId: "88463646557",
  appId: "1:88463646557:web:be96d39cbc25b087d052b4",
  measurementId: "G-V46PDJSK1K",
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

// TODO: register ReCAPTCHA v3 for lingo-mates and paste the site key here.
const RECAPTCHA_SITE_KEY = "<PASTE_LINGO_MATES_RECAPTCHA_SITE_KEY>";

let appCheck: AppCheck | null = null;

if (
  Platform.OS === "web" &&
  typeof document !== "undefined" &&
  !RECAPTCHA_SITE_KEY.startsWith("<")
) {
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
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
