# Feature-Based Architecture

VitaLoom Mobile uses feature modules for product capabilities and keeps Expo Router responsible for navigation composition. This lets features evolve independently while shared code remains small and feature-agnostic.

## Architecture overview

Dependencies flow in one direction:

```text
src/app -> src/features -> shared modules (src/components, src/theme, src/lib, ...)
```

`src/app/` declares routes and layouts. Route files render feature screens and configure navigation; they do not own feature behavior. Features own their screens and any feature-specific components, hooks, API calls, schemas, state, or types. Shared modules may be used by the app and by features, but must not import feature code.

Current feature boundaries include `auth`, `home`, `profile`, `statistics`, `water`, `sleep`, `heart-rate`, and `steps`. Add new capabilities as feature modules rather than adding a global services or business-logic layer.

## Reference project structure

This is the target organization for new code. Route names below illustrate the requested layout; keep the app's existing route names until a navigation change is explicitly required. Create optional directories only when they contain real code.

```text
vita-loom-mobile/
├── assets/                         # Images and fonts
├── src/
│   ├── app/                        # Expo Router routes and layouts only
│   │   ├── _layout.tsx
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   ├── (tabs)/
│   │   │   ├── index.tsx
│   │   │   ├── water.tsx
│   │   │   ├── sleep.tsx
│   │   │   └── profile.tsx
│   │   └── water/
│   │       ├── progress.tsx
│   │       └── add.tsx
│   ├── features/
│   │   ├── auth/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── screens/
│   │   │   ├── schemas/
│   │   │   ├── store/
│   │   │   └── types/
│   │   ├── profile/
│   │   ├── water/
│   │   ├── sleep/
│   │   ├── heart-rate/
│   │   └── steps/
│   ├── components/
│   │   └── ui/                     # Shared design system
│   ├── lib/
│   │   ├── api/                    # Shared HTTP client
│   │   ├── storage/                # Secure storage
│   │   └── query/                  # TanStack Query setup
│   ├── hooks/                      # Shared hooks
│   ├── providers/                  # Global providers
│   ├── constants/
│   ├── theme/                      # Colors, spacing, fonts
│   └── types/
├── tests/
├── app.json
├── tsconfig.json
└── package.json
```

The current app uses `sign-in`, `home`, and a nested `water/index` and `water/history` stack rather than the illustrative `login`, tabbed `water`, `water/progress`, and `water/add` routes. It also has `home` and `statistics` features. The architecture rule is the placement and dependency direction, not these example route names. The `api`, `storage`, `query`, and `tests` entries describe where future implementations belong; do not add packages or empty scaffolding just to match the tree.

## Directory responsibilities

| Location | Responsibility |
| --- | --- |
| `src/app/` | Expo Router routes, route groups, layouts, and navigation configuration only |
| `src/features/<feature>/screens/` | Screen implementations belonging to one feature |
| `src/features/<feature>/components/` | UI components used only by that feature |
| `src/features/<feature>/data/` | Feature-local sample or static data when needed |
| `src/features/<feature>/api/` | Feature-specific API functions, when introduced |
| `src/features/<feature>/hooks/` | Feature-specific hooks, when introduced |
| `src/features/<feature>/schemas/` | Feature validation schemas, when introduced |
| `src/features/<feature>/store/` | Feature-local state, when introduced |
| `src/features/<feature>/types/` | Feature-specific types, when introduced |
| `src/components/ui/` | Reusable presentation components without feature behavior |
| `src/theme/` | Central design tokens and styling foundations; extend the existing theme |
| `src/lib/` | Shared technical utilities, API client, or storage infrastructure when needed |
| `src/providers/` | Application-wide context providers when needed |
| `src/hooks/` | Generic reusable hooks only |
| `src/constants/`, `src/types/` | Values or types that are genuinely shared across features |
| `docs/architecture/` | Architecture decisions and contributor conventions |

Create feature subdirectories only when a feature has code for that responsibility. Do not add empty folders, placeholder APIs, or speculative abstractions.

## Routing and screen composition

Expo Router discovers routes from `src/app/`. Keep every file there a route or `_layout.tsx` layout. The current route organization uses `(auth)` for sign-in and `(tabs)` for Home, Statistics, and Profile. `src/app/index.tsx` redirects to `/(tabs)/home`; it does not decide whether a user is authenticated. Water's nested stack contains its own index and history routes.

Keep route components thin. A route should import or re-export the corresponding screen from `src/features/<feature>/screens/`, while layouts compose Stack or Tabs navigation. Feature code must never import route components. Do not add authentication redirects, protected routes, or guards until session state and the intended auth flow exist.

For example, `src/app/water/index.tsx` contains only:

```tsx
export { default } from '@/features/water/screens/water-landing';
```

Use nested route layouts for feature-specific navigation, such as Water detail screens. Avoid duplicating a screen implementation in both a route and a feature.

## Example: Water landing

The current Water route and screen show the feature boundary in practice:

```text
src/app/water/
├── _layout.tsx                         # Configures the Water stack
├── index.tsx                           # Re-exports WaterLandingScreen
└── history.tsx                         # Re-exports the history screen
src/features/water/
├── components/
│   ├── water-icon.tsx
│   ├── bottle.tsx
│   ├── progress-card.tsx
│   ├── amount-tile.tsx
│   ├── quick-add-card.tsx
│   └── intake-card.tsx
├── data/
│   └── intake.ts                       # Local sample entries and daily goal
├── screens/
│   ├── water-landing.tsx               # State, add-intake action, composition
│   └── water-history-screen.tsx
└── types/
    └── water.ts                        # Water-local UI and intake types
```

`water-landing.tsx` owns Water's local state, add-intake action, and screen composition. Feature-specific UI lives in `components/`, with one named component per file. `data/intake.ts` owns the local sample entries and daily goal; `types/water.ts` holds types shared by Water files. The route contains no feature behavior. This gives the screen, components, and feature data distinct responsibilities while keeping all Water-specific code inside the Water feature.

The screen imports `ThemedText` from shared UI, `useTheme` from shared hooks, and layout and style tokens from `src/theme/`. Those shared modules must remain independent of Water. The intake entries and goal in this example are local sample data, not a backend integration; future Water API calls belong in `src/features/water/api/` and shared client infrastructure belongs in `src/lib/api/` when introduced.

## Feature module conventions

- Use lowercase kebab-case for filenames and lowercase names for feature folders.
- Put screens and their private UI inside the owning feature. Extract named, nontrivial UI components into separate files under that feature's `components/` directory; screens compose them.
- Keep feature API calls, validation, state, and types next to the feature that owns them.
- Import screen components directly from their source file; a screen can use a named or default export.
- Add only the directories and files required by implemented code; do not create empty scaffolding.
- Keep shared components presentation-only. Promote a component to `src/components/ui/` when more than one feature needs it and its API can remain independent of feature concepts.
- Use the existing design tokens in `src/theme/` for repeated visual values. Do not add a competing design system or styling dependency.

## Imports and dependencies

- Use the configured `@/` alias for imports rooted at `src/`.
- Prefer direct imports over redundant barrel files.
- Shared modules must not depend on feature modules.
- Features may depend on shared modules, but not on `src/app/` or another feature's internal implementation.
- Avoid circular dependencies and cross-feature imports. If features need to coordinate, put a stable shared contract in an appropriate shared module or compose them at the app layer.
- Keep API clients and infrastructure in `src/lib/`; keep feature API functions inside their feature's `api/` directory.

## Adding a feature

1. Create `src/features/<feature>/` and only the subdirectories needed for its first implementation.
2. Put screen implementations under `screens/`; keep feature-specific components and logic co-located.
3. Add route declarations and any navigation layout under `src/app/`. Routes should only compose the feature screens.
4. Reuse existing shared UI and theme tokens. Promote code to shared modules only when there is a real cross-feature use case.
5. Update this document if the change establishes a new architecture convention.
6. Run `npx tsc --noEmit` and `npx expo lint` before considering the change complete.

## Common anti-patterns

- Putting business logic, API calls, or state in route files.
- Importing route components from a feature or importing another feature's internals.
- Growing a global `services/` directory for unrelated feature APIs.
- Making shared UI components depend on feature names or data models.
- Creating empty module directories, generic abstractions, or barrel files without a current use case.
- Duplicating screen implementations between routes and feature modules.
- Adding global state, an auth guard, fake API behavior, or a styling/state library before the product needs it.

## Rules for coding agents

- Read this document before adding or moving app code.
- Keep changes within the feature or shared module that owns the behavior; do not expand scope into unrelated features.
- Preserve existing Expo configuration, theme tokens, and project instructions. Do not change the Expo SDK as part of architecture work.
- Do not introduce business behavior, placeholder APIs, or full screens when only scaffolding is required.
- Keep route files thin and check imports against the dependency direction above.
- Add no dependency unless the requested implementation requires it, and follow the repository's Expo package installation instructions.
- Run the project typecheck and lint commands after implementation.
