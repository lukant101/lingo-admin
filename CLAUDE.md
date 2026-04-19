# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Expo/React Native admin app (forked from `lingo-creators`) that reuses the creators' deck-creation UX but signs in users against the `lingo-mates` Firebase project. The primary target is the web (`npm run web`). Uses Firebase authentication with Bearer tokens and calls mobile-specific API endpoints on the web backend at `https://api.lingohouse.app`.

## Commands

```bash
npm run start     # Start Expo dev server
npm run ios       # iOS simulator
npm run android   # Android emulator
npm run web       # Web browser
```

No build, test, or lint scripts are configured.

## Architecture

### Authentication Flow

- Firebase JS SDK with AsyncStorage persistence
- Mobile uses `Authorization: Bearer <idToken>` (web uses session cookies)
- API client in `lib/api/client.ts` auto-injects auth tokens
- `AuthGate` component protects routes in `(tabs)` layout

### Routing (Expo Router - file-based)

- `app/(auth)/` - Login/signup (unprotected)
- `app/(tabs)/` - Dashboard, sales, settings (protected by AuthGate)
- `app/creator/` - Application flow
- `app/monetization/` - Stripe setup
- `app/studio/[studioId]/` - Dynamic studio routes

### State Management

- React Context: `AuthContext` (user state), `CreatorAccountContext` (Firestore data)
- React Query: API calls and server state
- Contexts wrap app in `app/_layout.tsx`

### API Layer

All API functions in `lib/api/` use the base client which handles auth. Swagger documentation is available at `http://localhost:3000/api-doc-json`.

### Deep Linking

App scheme: `lingoadmin://` (configured in app.json)

## Key Patterns

### Imports

Use absolute aliases: `@/lib/firebase`, `@/components/ui/Button`

### UI Components

Prefer React Native Paper (`react-native-paper`) components when a suitable one exists. Custom primitives in `components/ui/` wrap or extend Paper components.

### Types

All shared types in `types/` - import from `@/types`

### Colors

Theme colors in `constants/Colors.ts` with light/dark variants

## Environment Variables

| Variable              | Description                                          |
| --------------------- | ---------------------------------------------------- |
| `EXPO_PUBLIC_API_URL` | API base URL (default: `https://api.lingohouse.app`) |

## Coding Style

- TypeScript strict mode
- 2-space indentation
- PascalCase components, camelCase functions
- No lint config - follow existing patterns
