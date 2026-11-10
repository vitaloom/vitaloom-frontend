# Onboarding implementation

## Design source and runtime assets

The source is `vitaloom/vitaloom-design` `main` at `8d5bec49dcaf5183b837073988f798d79da45e0b`. The approved WebPs are the visual reference, and the behavior document defines navigation and accessibility. [Approved screens](https://github.com/vitaloom/vitaloom-design/tree/8d5bec49dcaf5183b837073988f798d79da45e0b/onboarding) · [Behavior](https://github.com/vitaloom/vitaloom-design/blob/8d5bec49dcaf5183b837073988f798d79da45e0b/onboarding/BEHAVIOR.md) · [Asset manifest](https://github.com/vitaloom/vitaloom-design/blob/8d5bec49dcaf5183b837073988f798d79da45e0b/assets/onboarding/asset-manifest.json)

| Screen | Approved WebP in design `onboarding/` | Original hero in design and frontend `assets/onboarding/` | Original landscape in design and frontend `assets/onboarding/` |
| --- | --- | --- | --- |
| ONB-SCR-001 | `01-welcome.webp` | [welcome-hero.svg](../../../assets/onboarding/welcome-hero.svg) | [welcome-landscape.svg](../../../assets/onboarding/welcome-landscape.svg) |
| ONB-SCR-002 | `02-track-what-matters.webp` | [track-hero.svg](../../../assets/onboarding/track-hero.svg) | [track-landscape.svg](../../../assets/onboarding/track-landscape.svg) |
| ONB-SCR-003 | `03-build-healthy-habits.webp` | [habits-hero.svg](../../../assets/onboarding/habits-hero.svg) | [habits-landscape.svg](../../../assets/onboarding/habits-landscape.svg) |
| ONB-SCR-004 | `04-see-your-progress.webp` | [progress-hero.svg](../../../assets/onboarding/progress-hero.svg) | [progress-landscape.svg](../../../assets/onboarding/progress-landscape.svg) |

All eight SVGs are byte-identical to the pinned Git blobs. Each has a transparent `0 0 390 570` canvas. Metro bundles the sibling PNG with the same stem for each layer. [Pinned SVG source directory](https://github.com/vitaloom/vitaloom-design/tree/8d5bec49dcaf5183b837073988f798d79da45e0b/assets/onboarding)

The hero SVGs combine gradients and an SVG filter chain with `feComponentTransfer`, blur, offset, and merge. The checked-in PNGs retain those effects without depending on identical filter and font rendering on iOS and Android. They were exported directly from the SVGs with `@resvg/resvg-js` 2.6.2 using `fitTo: { mode: 'width', value: 1170 }` with system fonts and a transparent background. Decoded output is 1170 × 1710 RGBA for each file, with both transparent and visible pixels. The existing `react-native-svg` renders the simple brand and action icons. No build configuration change is required.

The optional mint-leaf cluster was inspected. The matched layers already include foliage. Approved WebPs were reviewed from the design checkout. [Shared mint-leaf source](https://github.com/vitaloom/vitaloom-design/blob/8d5bec49dcaf5183b837073988f798d79da45e0b/assets/shared/mint-leaf-cluster.svg)

## Composition and navigation

- `src/app/onboarding/index.tsx` exposes `/onboarding` and supplies the completion callback.
- `OnboardingScreen` owns the current page, press guard, announcements, scroll position, and responsive stage layout. It draws the cream-to-mint gradient behind the artwork and rounded panel. On short viewports or when text expands, the content scrolls vertically.
- `OnboardingHero` contains the landscape and hero within one aspect-ratio-preserving stage. The first slide also renders the Healthy Check brand and tagline as native UI. Subsequent artwork fades in unless system reduced motion is active.
- `OnboardingPanel` renders the title, copy, pagination, and CTA using theme tokens. The same page index selects both artwork and the active dot. The heading includes the current page number for assistive technology.
- `advance-onboarding.ts` allows one advance per transition window and one completion. CTA labels in order are **Get Started**, **Next**, **Next**, **Get Started**. The controls are CTA-driven. Swiping and in-carousel System Back were proposed in the design and are outside this implementation.

The final CTA calls `router.replace('/(auth)/welcome')` through the route callback. The parallel Authentication branch owns that destination. After integration, the app entry router can decide when to open `/onboarding` after checking restored session state. The completion callback is the boundary for recording a completion flag if product approves a persistence policy. First-run and logout-repeat policy remain open.

## Verification

- `npm run lint` and `npx tsc --noEmit` passed.
- `node --test tests/*.test.cjs tests/*.test.mjs src/features/onboarding/__tests__/*.test.cjs` passed all 12 tests, including the three onboarding tests for sequential advance, rapid-press suppression, and one-time completion.
- Expo Metro exported the Android and iOS bundles with all eight PNG assets.
- Chrome rendered all four slides at 390 × 844, 320 × 568, and 430 × 932. The browser check exercised image loads, page headings, pagination, reachable CTAs, rapid presses, and the final `/(auth)/welcome` URL. Reduced motion was enabled for the narrow and tall runs. The approved light artwork and white panel are used across system appearances.
- Android and iOS device rendering, native text scaling, VoiceOver, and TalkBack remain unverified. The Authentication Welcome screen requires the parallel branch for end-to-end verification.

## Visual gaps awaiting acceptance

The SVG redraws remain **PENDING_VISUAL_ACCEPTANCE**.

| Screen | Visible differences from the approved WebP |
| --- | --- |
| Welcome | The photographic figure is now a stylized vector with flat facial features and a simplified bottle and hand. The decorative lettering uses a different face and omits the reference heart flourish. |
| Track What Matters | The flatter phone has simpler shadows and card art. The heart-rate waveform is absent and the Steps art uses a shorter bar group. |
| Build Healthy Habits | The calendar rings, bottle, clock, and heart use flatter silhouettes with simpler shading and a changed arrangement. |
| See Your Progress | The card, chart bars, and trophy use flatter geometry. The trophy card copy and placement differ from the approved image. |

The native panel uses system fonts and theme spacing, so wrapping and vertical placement vary with viewport and accessibility text size.
