---
name: vitaloom-visual-ui
description: Use when building or reviewing VitaLoom mobile UI, shared React Native components, styling tokens, decorative graphics, or motion in this Expo app.
---

# VitaLoom visual UI

Read [`docs/ui/README.md`](../../../docs/ui/README.md), [`docs/ui/tokens.md`](../../../docs/ui/tokens.md), and [`docs/ui/components-and-qa.md`](../../../docs/ui/components-and-qa.md) before changing visible UI. Treat screenshot-derived values as provisional; the source of truth is `src/theme/index.ts`.

1. Use semantic roles from `@/theme` for colors and named typography, spacing, sizing, radius, effect, and motion tokens. Primitive palette values belong in the theme, not a screen. Explain a truly local optical value in a code comment. Add a recurring value to the theme and docs.
2. Reuse an existing shared component when it expresses the same role and states. Add a variant for a real new intent instead of overriding its identity colors. Extract new shared structure only after two screens need the same nameable pattern.
3. Separate **layout** (safe areas, flex, gaps, hit regions), **graphic assets** (water, waves, leaves, icons), and **animations** (timing and transitions). A graphic cannot replace an accessible label or progress value; animation cannot be the sole selected-state cue. Check the Expo native UI and animation guidance before platform controls or motion work.
4. Keep platform navigation and controls native. Avoid introducing a second styling system or a large component package for a single control. Preserve system font scaling, touch targets, contrast, and reduced-motion behavior.
5. When screenshot tooling is available, review iOS and Android, light and dark, narrow and wide phones, and enlarged text against the visual QA checklist. Fix repeated defects in tokens or shared components, then inspect the rendered result again. Record any untested appearance as provisional.

Example: a hydration action uses `colors[scheme].accent` with `onAccent`, `typography.bodyStrong`, `spacing.md`, `sizing.controlComfortable`, and `radius.full`; the water illustration remains a separate decorative asset with an accessible text value beside it.
