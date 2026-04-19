import { auth } from "@/lib/firebase";
import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import {
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  User,
} from "firebase/auth";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";

// Google Sign-in on native uses @react-native-google-signin/google-signin (not installed).
// On web, Firebase signInWithPopup handles Google auth instead.
// To restore native support, install the package and add the require back here.
const GoogleSignin: any = null;
const statusCodes: any = null;

type AuthContextType = {
  user: User | null;
  emailVerified: boolean;
  isLoading: boolean;
  checkedAuthState: boolean;
  isGoogleAuthAvailable: boolean;
  isAppleAuthAvailable: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkedAuthState, setCheckedAuthState] = useState(false);
  const [isGoogleAuthAvailable] = useState(true);
  // Apple Sign-in is available on all platforms (native SDK on iOS, web-based on Android/Web)
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(
    Platform.OS !== "ios"
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setEmailVerified(firebaseUser?.emailVerified ?? false);
      setCheckedAuthState(true);
    });

    return unsubscribe;
  }, []);

  // Check Apple Sign-in availability on iOS (native SDK)
  useEffect(() => {
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync().then(setIsAppleAuthAvailable);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await sendEmailVerification(userCredential.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) throw new Error("No user signed in");
    await sendEmailVerification(auth.currentUser);
  }, []);

  const reloadUser = useCallback(async () => {
    if (!auth.currentUser) throw new Error("No user signed in");
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true); // force-refresh the cached ID token
    setEmailVerified(auth.currentUser.emailVerified);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    try {
      if (Platform.OS === "web") {
        // Web: use Firebase popup
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } else {
        // Native: use Google Sign-in SDK
        if (!GoogleSignin || !statusCodes) {
          throw new Error("Google Sign-in is not available on this platform");
        }

        // Check for Play Services on Android
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });

        // Sign in with Google
        const signInResult = await GoogleSignin.signIn();

        // Get the ID token
        const idToken = signInResult.data?.idToken;
        if (!idToken) {
          throw new Error("No ID token received from Google");
        }

        // Create Firebase credential and sign in
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
      }
    } catch (error: any) {
      // Handle web-specific cancellation errors
      if (
        error.code === "auth/popup-closed-by-user" ||
        error.code === "auth/cancelled-popup-request" ||
        error.code === "auth/user-cancelled"
      ) {
        return;
      }
      // Handle specific Google Sign-in errors (native)
      if (statusCodes) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          return;
        }
        if (error.code === statusCodes.IN_PROGRESS) {
          return;
        }
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          throw new Error("Google Play Services required");
        }
      }
      // Handle Firebase-specific errors
      if (error.code === "auth/account-exists-with-different-credential") {
        throw new Error("Account exists with different sign-in method");
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    setIsLoading(true);
    try {
      if (Platform.OS === "web") {
        // Web: use Firebase popup with Apple provider
        const provider = new OAuthProvider("apple.com");
        provider.addScope("email");
        provider.addScope("name");
        await signInWithPopup(auth, provider);
      } else if (Platform.OS === "ios") {
        // iOS: use native Apple Authentication
        // Generate nonce for security
        const nonce = Math.random().toString(36).substring(2, 10);
        const hashedNonce = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          nonce
        );

        // Request Apple authentication
        const appleCredential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
          nonce: hashedNonce,
        });

        const { identityToken } = appleCredential;
        if (!identityToken) {
          throw new Error("No identity token received from Apple");
        }

        // Create Firebase credential and sign in
        const provider = new OAuthProvider("apple.com");
        const credential = provider.credential({
          idToken: identityToken,
          rawNonce: nonce,
        });
        await signInWithCredential(auth, credential);
      } else if (Platform.OS === "android") {
        // Android: use web-based Apple OAuth flow via expo-auth-session
        const nonce = Crypto.randomUUID();
        const hashedNonce = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          nonce
        );

        const redirectUri = AuthSession.makeRedirectUri({
          scheme: "lingoadmin",
          path: "sign-in-with-apple",
        });

        const authRequest = new AuthSession.AuthRequest({
          clientId: "web.app.lingohouse",
          redirectUri,
          responseType: AuthSession.ResponseType.IdToken,
          scopes: ["email", "name"],
          extraParams: {
            nonce: hashedNonce,
            response_mode: "fragment",
          },
        });

        const discovery = {
          authorizationEndpoint: "https://appleid.apple.com/auth/authorize",
          tokenEndpoint: "https://appleid.apple.com/auth/token",
        };

        const result = await authRequest.promptAsync(discovery);

        if (result.type === "cancel" || result.type === "dismiss") {
          return;
        }

        if (result.type !== "success" || !result.params.id_token) {
          throw new Error("Apple Sign-in failed");
        }

        // Create Firebase credential and sign in
        const provider = new OAuthProvider("apple.com");
        const credential = provider.credential({
          idToken: result.params.id_token,
          rawNonce: nonce,
        });
        await signInWithCredential(auth, credential);
      } else {
        throw new Error("Apple Sign-in is not available on this platform");
      }
    } catch (error: any) {
      // Handle web-specific cancellation errors
      if (
        error.code === "auth/popup-closed-by-user" ||
        error.code === "auth/cancelled-popup-request" ||
        error.code === "auth/user-cancelled"
      ) {
        return;
      }
      // Handle user cancellation silently (iOS)
      if (error.code === "ERR_REQUEST_CANCELED") {
        return;
      }
      // Handle Firebase-specific errors
      if (error.code === "auth/account-exists-with-different-credential") {
        throw new Error("Account exists with different sign-in method");
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      // Sign out from Google if signed in (native only)
      if (GoogleSignin) {
        try {
          await GoogleSignin.signOut();
        } catch {
          // Ignore errors if not signed in with Google
        }
      }

      await firebaseSignOut(auth);
      // Clear any stored tokens (SecureStore not available on web)
      if (Platform.OS !== "web") {
        await SecureStore.deleteItemAsync("userToken");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      emailVerified,
      isLoading,
      checkedAuthState,
      isGoogleAuthAvailable,
      isAppleAuthAvailable,
      signIn,
      signUp,
      signInWithGoogle,
      signInWithApple,
      resetPassword,
      sendVerificationEmail,
      reloadUser,
      signOut,
    }),
    [
      user,
      emailVerified,
      isLoading,
      checkedAuthState,
      isGoogleAuthAvailable,
      isAppleAuthAvailable,
      signIn,
      signUp,
      signInWithGoogle,
      signInWithApple,
      resetPassword,
      sendVerificationEmail,
      reloadUser,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
