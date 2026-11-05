# VitaLoom Frontend

The active mobile application for VitaLoom, built with Expo, React Native and TypeScript.

## Current baseline

- Expo SDK 58, React Native 0.88 and Expo Router.
- The home route currently renders the Water landing UI prototype.
- The Water screen currently uses local sample data; Backend API integration is not complete.
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

The canonical API behavior is maintained in [vitaloom-backend/docs/api/api-contract.md](https://github.com/vitaloom/vitaloom-backend/blob/main/docs/api/api-contract.md). Coordinate API changes with the Backend repository rather than independently changing request/response shapes here.

Add environment configuration (including a committed `.env.example`) as part of the first API integration task; the current UI prototype does not yet require an API base URL.

## Scope boundaries

VitaLoom's current product direction includes Heart Rate, Steps, Sleep and Water tracking, with broader account, profile, goals and reporting capabilities defined in the business specifications. A screen or capability is not considered implemented merely because it appears in a requirement document or design reference.
