# Social Authentication Setup Guide

This guide covers the manual configuration steps required to enable Google Sign-in and Apple Sign-in in the Lingo Admin app.

## Prerequisites

- Access to [Firebase Console](https://console.firebase.google.com)
- Access to [Apple Developer Portal](https://developer.apple.com) (for Apple Sign-in)
- Access to [Google Cloud Console](https://console.cloud.google.com) (for Android SHA-1)

---

## Platform Implementation

Social sign-in uses different libraries depending on the platform:

| Platform | Google                        | Apple                            |
| -------- | ----------------------------- | -------------------------------- |
| Web      | Firebase `signInWithPopup`    | Firebase `signInWithPopup`       |
| iOS      | `@react-native-google-signin` | `expo-apple-authentication`      |
| Android  | `@react-native-google-signin` | `expo-auth-session` (OAuth flow) |

### Why native SDKs on mobile?

The Firebase JS SDK's `signInWithPopup` cannot be used on native iOS/Android for several reasons:

1. **No browser popups in React Native** - `signInWithPopup` relies on browser popup windows, which don't exist in React Native's native context.

2. **User experience** - Native SDKs provide the expected mobile UX: Google shows the familiar account picker sheet, Apple integrates with Face ID/Touch ID.

3. **App Store requirement** - Apple **requires** apps that offer third-party sign-in to implement Sign in with Apple using the native SDK. Apps using a web-based Apple auth flow on iOS will be rejected from the App Store.

The implementation is in `contexts/AuthContext.tsx`.

---

## 1. Firebase Console Setup

### Enable Google Sign-in Provider

1. Go to Firebase Console → Your Project → Authentication → Sign-in method
2. Click on **Google** provider
3. Toggle **Enable**
4. Set a public-facing name for your app
5. Select a support email
6. Click **Save**
7. Note the **Web Client ID** shown - you'll need this for the app

### Enable Apple Sign-in Provider

1. In the same Sign-in method page, click on **Apple**
2. Toggle **Enable**
3. Click **Save**

### Download Config Files

1. Go to Project Settings (gear icon) → General
2. Scroll to "Your apps" section
3. **For iOS:**
   - Click on your iOS app (or add one if not exists)
   - Click **Download GoogleService-Info.plist**
   - Save to project root: `./GoogleService-Info.plist`
4. **For Android:**
   - Click on your Android app (or add one if not exists)
   - Click **Download google-services.json**
   - Save to project root: `./google-services.json`

---

## 2. Environment Variables

Add the Google Web Client ID to your environment:

```bash
# .env or .env.local
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id-here.apps.googleusercontent.com
```

The Web Client ID can be found in:

- Firebase Console → Authentication → Sign-in method → Google → Web SDK configuration
- Or in Google Cloud Console → APIs & Services → Credentials

---

## 3. Apple Developer Portal Setup

### Enable Sign in with Apple Capability

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to Certificates, Identifiers & Profiles → Identifiers
3. Select your App ID (or create one matching `com.lingohouse.creators`)
4. Scroll to **Sign in with Apple**
5. Check the box to enable it
6. Click **Save**

### Configure Service ID (for web/Android)

Apple Sign-in on web and Android requires a Service ID configured in Apple Developer Portal.

**This app uses the existing Lingo House Service ID:** `web.app.lingohouse`

To configure a new Service ID:

1. In Identifiers, click the **+** button
2. Select **Services IDs** and continue
3. Enter a description and identifier (e.g., `web.app.lingohouse`)
4. Enable **Sign in with Apple**
5. Click **Configure** and add:
   - **Domains:** `lingohouse.app` (your web domain)
   - **Return URLs:**
     - Web: `https://lingohouse.app/sign-in-with-apple`
     - Android: `lingocreators://sign-in-with-apple`

### Android Deep Link Setup

For Apple Sign-in on Android, ensure the redirect URI is configured:

1. **In `app.json`**, verify the scheme is set:

   ```json
   {
     "expo": {
       "scheme": "lingocreators"
     }
   }
   ```

2. **In Apple Developer Portal**, add the redirect URI to your Service ID:

   ```
   lingocreators://sign-in-with-apple
   ```

3. The Android implementation uses `expo-auth-session` to open Apple's OAuth page in a browser and handles the redirect back to the app

---

## 4. Android SHA-1 Fingerprint

Google Sign-in on Android requires your app's SHA-1 fingerprint registered in Firebase.

### Get Debug SHA-1

```bash
cd android
./gradlew signingReport
```

Look for the SHA1 value under `Variant: debug`.

### Get Release SHA-1

For production builds, you'll need the SHA-1 from your release keystore:

```bash
keytool -list -v -keystore your-release-key.keystore -alias your-alias
```

### Add to Firebase

1. Go to Firebase Console → Project Settings → General
2. Scroll to your Android app
3. Click **Add fingerprint**
4. Paste the SHA-1 value
5. Click **Save**

---

## 5. Build and Test

Social authentication requires native code and **will not work in Expo Go**.

### Development Build

```bash
# Generate native projects
npx expo prebuild

# Run on iOS Simulator
npx expo run:ios

# Run on Android Emulator
npx expo run:android
```

### Testing Checklist

- [ ] Google Sign-in works on iOS
- [ ] Google Sign-in works on Android
- [ ] Google Sign-in works on web (popup flow)
- [ ] Apple Sign-in works on iOS (native SDK, device recommended)
- [ ] Apple Sign-in works on Android (OAuth flow via browser)
- [ ] Apple Sign-in works on web (popup flow)
- [ ] Canceling auth flow shows no error (all platforms)
- [ ] Sign out works correctly
- [ ] New users appear in Firebase Console → Authentication → Users

---

## Troubleshooting

### "DEVELOPER_ERROR" on Android

- SHA-1 fingerprint not registered in Firebase
- Package name mismatch between app and Firebase config
- `google-services.json` is outdated

### "Google Play Services required"

- The Android device/emulator doesn't have Google Play Services
- Use a Google APIs emulator image

### Apple Sign-in not appearing on iOS

- `usesAppleSignIn` not set in app.json
- Capability not enabled in Apple Developer Portal

### Apple Sign-in fails on Android

- Redirect URI `lingocreators://sign-in-with-apple` not registered in Apple Developer Portal
- Service ID (`web.app.lingohouse`) not configured correctly
- App scheme not set in `app.json`

### "Account exists with different sign-in method"

- User previously signed up with email/password or another provider
- They need to sign in with their original method, or you can implement account linking

---

## File Locations

| File                       | Location                     | Purpose                     |
| -------------------------- | ---------------------------- | --------------------------- |
| `GoogleService-Info.plist` | `./GoogleService-Info.plist` | iOS Firebase config         |
| `google-services.json`     | `./google-services.json`     | Android Firebase config     |
| `.env`                     | `./.env`                     | Environment variables       |
| `app.json`                 | `./app.json`                 | Expo config with bundle IDs |
