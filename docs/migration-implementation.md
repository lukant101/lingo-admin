# Creator Functionality Migration: Next.js to Expo

This document describes the implementation of creator features migrated from the Next.js web app to this Expo mobile app.

## Overview

The migration enables creators to manage their accounts, submit applications, set up monetization via Stripe, and view sales data from the mobile app.

**Key architectural decision:** The web app uses session cookie authentication, but mobile apps use Bearer tokens. This required creating mobile-specific API endpoints in the web app that verify Firebase ID tokens instead of session cookies.

## Project Structure

```
creators/
├── app/                          # Expo Router screens
│   ├── _layout.tsx              # Root layout with providers
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   └── login.tsx            # Email/password login
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Tab navigation with AuthGate
│   │   ├── index.tsx            # Dashboard
│   │   ├── sales.tsx            # Sales statistics
│   │   └── settings.tsx         # Account settings
│   ├── creator/
│   │   ├── application.tsx      # Creator application form
│   │   └── status.tsx           # Application status display
│   ├── monetization/
│   │   ├── index.tsx            # Stripe account setup
│   │   └── onboarding.tsx       # Stripe return handler
│   └── studio/
│       └── [studioId]/
│           └── settings.tsx     # Studio configuration
├── components/
│   ├── AuthGate.tsx             # Auth protection wrapper
│   └── ui/
│       ├── Button.tsx           # Primary/secondary/outline/danger variants
│       ├── Card.tsx             # Content card
│       ├── Input.tsx            # Text input with label/error
│       ├── LoadingSpinner.tsx   # Loading indicator
│       └── Select.tsx           # Modal-based picker
├── constants/
│   └── Colors.ts                # Extended theme colors
├── contexts/
│   ├── AuthContext.tsx          # Firebase auth state
│   └── CreatorAccountContext.tsx # Creator status from Firestore
├── hooks/
│   └── useMonetizationReadiness.ts # Stripe account status
├── lib/
│   ├── api/
│   │   ├── client.ts            # Base fetch with Bearer auth
│   │   ├── creator.ts           # Application APIs
│   │   ├── monetization.ts      # Stripe account APIs
│   │   ├── sales.ts             # Sales data APIs
│   │   └── studios.ts           # Studio management APIs
│   ├── constants.ts             # DECK_LEVEL, API_BASE_URL
│   ├── firebase.ts              # Firebase initialization
│   └── linking.ts               # Deep link configuration
├── types/
│   ├── creator.ts               # CreatorStatus, CreatorApplicationFormData
│   ├── index.ts                 # Re-exports all types
│   ├── langs.ts                 # DeckLevel, Language
│   ├── payout.ts                # MonetizationAccount
│   ├── sales.ts                 # SaleTransaction, MonthlySalesStats
│   ├── studio.ts                # StudioSettings, StudioPass
│   ├── terms.ts                 # TermsAcceptance
│   └── user.ts                  # CreatorAccount, UserSettings
└── docs/
    └── migration-implementation.md  # This file
```

## Dependencies Added

```json
{
  "firebase": "^12.8.0",
  "expo-secure-store": "~14.0.0",
  "@tanstack/react-query": "^5.0.0",
  "@react-native-async-storage/async-storage": "^2.0.0"
}
```

## Authentication

### Firebase Setup (`lib/firebase.ts`)

Uses the Firebase JavaScript SDK with the same project configuration as the web app (`lingolinks-37122`). Auth state persists via AsyncStorage.

### AuthContext (`contexts/AuthContext.tsx`)

Provides:

- `user` - Current Firebase user or null
- `isLoading` - Auth operation in progress
- `checkedAuthState` - Initial auth check complete
- `signIn(email, password)` - Email/password sign in
- `signInWithGoogle(idToken)` - Google sign in (requires additional setup)
- `signOut()` - Sign out and clear stored tokens

### AuthGate (`components/AuthGate.tsx`)

Wrapper component that:

1. Shows loading spinner while checking auth state
2. Redirects to login if not authenticated
3. Renders children if authenticated

Used in `(tabs)/_layout.tsx` to protect all tab screens.

## API Client (`lib/api/client.ts`)

Base fetch wrapper that:

1. Gets the current user's Firebase ID token
2. Adds `Authorization: Bearer <token>` header
3. Handles JSON parsing and error responses
4. Throws `ApiClientError` with status code on failure

Helper functions:

- `apiGet<T>(endpoint, params?)` - GET request
- `apiPost<T>(endpoint, body?)` - POST request
- `apiPatch<T>(endpoint, body)` - PATCH request

## Mobile API Endpoints (Web App)

Created in `/Users/lukasz/projects/lhouse/web/src/app/api/mobile/`:

### Authentication Middleware (`lib/mobile-auth.ts`)

```typescript
mobileProtectedRoute(handler, options?)
```

Verifies Firebase ID token from `Authorization: Bearer <token>` header instead of session cookies. Same interface as `protectedRoute` for easy migration.

### Endpoints

| Endpoint                                     | Method | Description                   |
| -------------------------------------------- | ------ | ----------------------------- |
| `creator/application`                        | POST   | Submit creator application    |
| `creator/application/withdraw`               | POST   | Withdraw pending application  |
| `creator/monetization/account`               | GET    | Get Stripe account status     |
| `creator/monetization/account`               | POST   | Create Stripe Connect account |
| `creator/monetization/account`               | PATCH  | Update account (store name)   |
| `creator/monetization/account/revalidate`    | POST   | Refresh status from Stripe    |
| `creator/monetization/stripe-onboarding-url` | POST   | Get Stripe onboarding URL     |
| `creator/sales/stats`                        | GET    | Monthly sales statistics      |
| `creator/sales/transactions`                 | GET    | Transaction history           |
| `studios/create`                             | POST   | Create new studio             |
| `studios/settings`                           | GET    | Get studio settings           |
| `studios/settings`                           | PATCH  | Update studio settings        |
| `studios/upload-logo`                        | POST   | Upload studio logo            |

## Screens

### Login (`app/(auth)/login.tsx`)

- Email/password form with validation
- Redirects to dashboard on success
- Shows error alerts on failure

### Dashboard (`app/(tabs)/index.tsx`)

- Shows creator status with color-coded indicator
- "Apply to Become a Creator" button for new users
- "View Application Status" for pending applications
- Monetization and Sales cards for approved creators
- Pull-to-refresh to update status

### Sales (`app/(tabs)/sales.tsx`)

- Monthly stats card (net sales, transaction count, fees)
- Transaction list with amount, date, type
- Pull-to-refresh
- Locked state for non-creators

### Settings (`app/(tabs)/settings.tsx`)

- Account info (email, user ID)
- Creator settings (status, languages) if applicable
- App version
- Sign out button with confirmation

### Creator Application (`app/creator/application.tsx`)

- Multi-section form:
  - Personal info (legal name, email)
  - Language selection (code and name)
  - Content details (publishes online, links, description)
  - Stripe confirmation checkbox
- Character count for description (50-500)
- Submit to API, refresh context, navigate back

### Application Status (`app/creator/status.tsx`)

- Status display with icon and description
- Withdraw button for pending/under review
- Different states: applied, under_review, rejected, approved, etc.

### Monetization (`app/monetization/index.tsx`)

- Create account form (store name input)
- Account status display (charges enabled, payouts enabled)
- "Complete Stripe Setup" button opens WebBrowser
- Account details (country, currency, email)
- Pull-to-refresh after returning from Stripe

### Studio Settings (`app/studio/[studioId]/settings.tsx`)

- Name and description inputs
- Language and level display (read-only)
- "Available for Sale" toggle
- Pricing display (read-only, contact support to change)
- Save/Cancel buttons

## Deep Linking

App scheme: `lingocreators`

Configured in `app.json`:

```json
{
  "expo": {
    "scheme": "lingocreators"
  }
}
```

Stripe onboarding return URLs:

- Success: `lingocreators://monetization/success`
- Refresh: `lingocreators://monetization/refresh`

The `monetization/onboarding.tsx` screen handles these returns and redirects to the monetization index.

## Type Definitions

All types are copied from the web app's `/src/types/` directory to maintain consistency:

- **CreatorStatus**: `not_applied`, `applied`, `under_review`, `rejected`, `publish_standard`, `publish_premium`, etc.
- **CreatorApplicationFormData**: Form fields for application submission
- **MonetizationAccount**: Stripe Connect account details
- **SaleTransaction**: Individual sale record
- **MonthlySalesStats**: Aggregated monthly revenue
- **StudioSettings**: Studio configuration
- **DeckLevel**: CEFR levels (A1-C2)

## Environment Variables

| Variable              | Description               | Default                      |
| --------------------- | ------------------------- | ---------------------------- |
| `EXPO_PUBLIC_API_URL` | Base URL for API requests | `https://api.lingohouse.app` |

## Testing Checklist

1. **Auth Flow**
   - [ ] Sign in with email/password
   - [ ] Token persists across app restarts
   - [ ] Sign out clears state

2. **Creator Application**
   - [ ] Form validation works
   - [ ] Submit creates Firestore documents
   - [ ] Status updates after submission

3. **Monetization**
   - [ ] Create Stripe account
   - [ ] Onboarding flow opens in browser
   - [ ] Return to app updates status

4. **Sales**
   - [ ] Stats load for approved creators
   - [ ] Transactions display correctly
   - [ ] Pull-to-refresh works

5. **Studios**
   - [ ] Settings load correctly
   - [ ] Updates save to Firestore
   - [ ] Logo upload works

## Future Improvements

1. Add Google Sign-In (requires native configuration)
2. Add push notifications for status changes
3. Add offline support with React Query persistence
4. Add studio creation flow from mobile
5. Add analytics/error tracking
