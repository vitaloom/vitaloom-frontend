This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Architecture

- Follow the feature boundaries, dependency direction, route-to-screen pattern, and shared module conventions in [docs/architecture/feature-based.md](docs/architecture/feature-based.md).

## VitaLoom project baseline

- This is the active VitaLoom mobile repository; do not treat it as an untouched Expo starter.
- Read [the UI foundation](./docs/ui/README.md), [tokens](./docs/ui/tokens.md) and [component/QA guidance](./docs/ui/components-and-qa.md) before creating or changing screens.
- The source of truth for visual tokens is `src/theme/`; do not hardcode duplicate palettes, spacing scales or typography in screens.
- Routes live in `src/app/`; feature-owned screens and logic live under `src/features/`. Keep route files thin.
- The current home route renders the Water landing prototype. It uses local sample data and is not yet connected to the Backend API. Do not describe it as a completed end-to-end feature.
- `src/app/explore.tsx` still contains Expo starter content; do not use it as a VitaLoom product requirement or visual reference.
- The Backend API Contract is the source of truth for request/response shapes and behavior: https://github.com/vitaloom/vitaloom-backend/blob/main/docs/api/api-contract.md
- Do not invent API fields or duplicate backend business calculations in the client.
