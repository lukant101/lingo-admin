# Repository Guidelines

## Project Structure & Module Organization

- `app/`: Expo Router screens and layouts (e.g., `app/(auth)`, `app/(tabs)`).
- `components/`: Reusable UI building blocks (buttons, inputs, etc.).
- `contexts/`: React context providers for auth and creator account data.
- `lib/`: Firebase setup and API helpers (e.g., `lib/firebase.ts`, `lib/api/*`).
- `hooks/`: Custom React hooks.
- `constants/`: Shared constants like colors.
- `assets/`: Fonts and static assets.
- `types/`: Shared TypeScript types.
- `docs/`: Project documentation.

## Build, Test, and Development Commands

- `npm run start`: Start the Expo dev server.
- `npm run ios`: Start Expo and open the iOS simulator.
- `npm run android`: Start Expo and open the Android emulator.
- `npm run web`: Start Expo for web.

There are no build or test scripts defined beyond Expo start commands.

## Coding Style & Naming Conventions

- Language: TypeScript + React Native.
- Indentation: 2 spaces (match existing files).
- Naming: `PascalCase` for components, `camelCase` for functions/variables.
- Imports use absolute aliases (e.g., `@/lib/firebase`).
- No lint or formatter config is present; follow existing file patterns.

## Testing Guidelines

- No test framework is configured in `package.json`.
- `react-test-renderer` is included but unused; if adding tests, document how to run them and keep naming consistent (e.g., `*.test.tsx`).

## Commit & Pull Request Guidelines

- Git history uses short, imperative messages (e.g., “add sign-up page”).
- No strict convention (e.g., Conventional Commits) is enforced.
- For PRs, include:
  - A clear summary of changes.
  - Screenshots for UI updates.
  - Any setup/config changes (e.g., Firebase config).

## Security & Configuration Tips

- Firebase config lives in `lib/firebase.ts`. Ensure it points to the `lingo-mates` project (auth is shared with the Lingo Mates app).
- Auth flows are in `contexts/AuthContext.tsx` and screens in `app/(auth)`.

## Notes for Contributors

- Keep UI additions consistent with existing `components/ui` primitives.
- When adding new routes, register them under `app/` and confirm navigation via Expo Router.
