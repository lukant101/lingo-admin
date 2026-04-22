# Lingo Admin

Expo/React Native admin app that signs users into the `lingo-mates` Firebase project. Primary target is the web (`npm run web`). Forked from `lingo-creators` and reuses its deck-creation UX.

## Architecture at a glance

- **Auth:** Firebase JS SDK (AsyncStorage persistence on native, browser local on web). Firebase ID tokens are sent as `Authorization: Bearer <idToken>` to the backend at `EXPO_PUBLIC_API_URL`. `AuthGate` protects the `(tabs)` route group.
- **Routing:** Expo Router, file-based. `app/(auth)/` is unprotected; `app/(tabs)/` is protected; `app/creator/`, `app/monetization/`, and `app/studio/[studioId]/` cover the deeper flows.
- **State:** React Context (`AuthContext`, `CreatorAccountContext`) for identity + Firestore-backed account data; React Query for server state.
- **UI:** React Native Paper primitives, with thin wrappers in `components/ui/`.

See `CLAUDE.md` for a deeper tour of the codebase.

## Commands

```bash
npm run start    # Expo dev server (pick a target from the CLI)
npm run web      # web browser (primary target)
npm run ios      # iOS simulator
npm run android  # Android emulator
```

No build, test, or lint scripts are configured.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values
npm run web
```

### First-time sign-in: register an App Check debug token

The `lingo-mates` Firebase project enforces App Check on Auth, so a fresh checkout cannot sign in until you register a debug token for your machine. You only need to do this once per browser profile.

1. Run `npm run web` and open the browser devtools console.
2. On first load, Firebase prints a line like:
   ```
   App Check debug token: 12345678-aaaa-bbbb-cccc-dddddddddddd. You will need to add it to your app's App Check settings in the Firebase console for it to work.
   ```
   Copy the UUID.
3. In [Firebase Console](https://console.firebase.google.com/) → **lingo-mates** project → Build → **App Check** → **Apps** tab → the `lingohouse-admin` web app → `⋮` → **Manage debug tokens** → **Add debug token**. Paste the UUID and name it (e.g. `<your-name> localhost`).
4. Reload the page. The `appCheck/recaptcha-error` warning should be gone and sign-in works.

If the debug-token line doesn't appear in the console, make sure you're running a dev build (`npm run web`, not a production export) — debug mode is gated on `__DEV__`.

### Environment variables

See `.env.example`. Notable:

- `EXPO_PUBLIC_API_URL` — backend base URL (default `https://api.lingohouse.app`).
- `EXPO_PUBLIC_FIREBASE_RECAPTCHA_SITE_KEY` — reCAPTCHA v3 site key for App Check. Required for production builds; ignored in dev (debug token flow is used instead).
