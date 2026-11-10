# VitaLoom Frontend

The active mobile application for VitaLoom, built with Expo, React Native and TypeScript.

## Current baseline

- Expo SDK 58, React Native 0.88 and Expo Router.
- The home route currently renders the Water landing UI prototype.
- The Water screens use the authenticated Backend Water API for saved logs, daily summaries and weekly progress.
- The Explore route still contains some Expo starter content and is not a finalized VitaLoom product screen.
- Shared visual tokens and UI guidance are maintained in `src/theme/` and `docs/ui/`.

The repository is an active implementation workspace, not yet a complete four-metric MVP.

## Prerequisites

- Node.js and npm.
- Expo Go or a compatible development environment for the target platform.

## Get started

From the repository root:

```bash
npm install
npx expo start
```

Use the Expo CLI prompts to open the application in an emulator, simulator or Expo Go where supported.

## Development checks

```bash
npm run lint
npx tsc --noEmit
```

Run the relevant checks after changing screens, navigation, theme or shared components. Do not report a check as passed unless it was actually run.

## Project structure

```text
src/
├── app/          # Expo Router routes and layouts
├── features/     # Feature-owned screens and behavior
├── components/   # Reusable UI components
├── hooks/        # Shared React hooks
└── theme/        # Source of truth for visual tokens

docs/ui/
├── README.md
├── tokens.md
└── components-and-qa.md
```

## Design and UI conventions

Start with [UI Foundation](./docs/ui/README.md), [Design Tokens](./docs/ui/tokens.md) and [Components & Visual QA](./docs/ui/components-and-qa.md).

- Prefer semantic theme roles over direct color values.
- Create shared components when at least two screens need the same nameable structure.
- Preserve native platform behavior, safe areas, accessibility labels and text scaling.
- Treat inferred visual values as provisional until reviewed on real devices.

## Backend integration

The canonical API behavior is maintained in [vitaloom-backend/docs/api/api-contract.md](https://github.com/vitaloom/vitaloom-backend/blob/main/docs/api/api-contract.md). The auth client uses `EXPO_PUBLIC_API_BASE_URL` as the backend origin; copy `.env.example` to `.env` and set a host reachable from the device. The example uses `http://10.0.2.2:8080` for an Android emulator. A physical device needs the development machine's current LAN address and the actual backend `SERVER_PORT` (for example, `http://192.168.1.7:6969` on one local network). Restart Expo after changing `.env` so the app receives the new URL.

After sign-in or registration, the access token stays in memory and the refresh token is stored with Expo SecureStore. Startup exchanges the stored refresh token and loads `/api/auth/me`; protected requests refresh once and retry once when needed. Sign-out clears local credentials. Lint, typecheck and auth concurrency tests pass; a device/emulator end-to-end walkthrough has not yet been run.

Water requests use the same authenticated client. Configure a backend URL reachable from the device before using Water Landing, Detailed Entry or Progress; these screens do not fall back to local sample data when a request fails. See the [Water API contract](docs/api/water-intake-proposal.md).

## Scope boundaries

VitaLoom's current product direction includes Heart Rate, Steps, Sleep and Water tracking, with broader account, profile, goals and reporting capabilities defined in the business specifications. A screen or capability is not considered implemented merely because it appears in a requirement document or design reference.
