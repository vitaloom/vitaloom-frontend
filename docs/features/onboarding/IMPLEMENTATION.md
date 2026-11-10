# Onboarding implementation

## Design source and runtime assets

The approved reference and behavior source is `vitaloom/vitaloom-design` `main` at `8d5bec49dcaf5183b837073988f798d79da45e0b`. The approved WebPs are the visual reference, and the behavior document defines navigation and accessibility. [Approved screens](https://github.com/vitaloom/vitaloom-design/tree/8d5bec49dcaf5183b837073988f798d79da45e0b/onboarding) · [Behavior](https://github.com/vitaloom/vitaloom-design/blob/8d5bec49dcaf5183b837073988f798d79da45e0b/onboarding/BEHAVIOR.md) · [Asset manifest](https://github.com/vitaloom/vitaloom-design/blob/8d5bec49dcaf5183b837073988f798d79da45e0b/assets/onboarding/asset-manifest.json)

The four runtime hero PNGs are the standalone images supplied in the follow-up. The combined four-screen WebP was used to compare composition.

| Screen | Approved WebP in design `onboarding/` | Runtime hero | Landscape composition |
| --- | --- | --- | --- |
| ONB-SCR-001 | `01-welcome.webp` | [welcome-hero.png](../../../assets/onboarding/welcome-hero.png), attachment 5 | Hills frame the portrait, with shrubs and low mint waves. |
| ONB-SCR-002 | `02-track-what-matters.webp` | [track-hero.png](../../../assets/onboarding/track-hero.png), attachment 2 | A low valley and layered waves leave room for the metrics phone. |
| ONB-SCR-003 | `03-build-healthy-habits.webp` | [habits-hero.png](../../../assets/onboarding/habits-hero.png), attachment 1 | A broad, high ridge frames the calendar and wellness objects. |
| ONB-SCR-004 | `04-see-your-progress.webp` | [progress-hero.png](../../../assets/onboarding/progress-hero.png), attachment 3 | An asymmetric ridge and rolling waves frame the chart and trophy. |

The PNGs retain the bytes of the supplied assets. The original design SVGs remain in `assets/onboarding/` for provenance. The four landscape PNGs from the earlier implementation were retired. The runtime landscape uses the existing `react-native-svg` dependency, and `expo-image` contains and bottom-aligns the hero at its original aspect ratio. [Pinned SVG source directory](https://github.com/vitaloom/vitaloom-design/tree/8d5bec49dcaf5183b837073988f798d79da45e0b/assets/onboarding)

## Composition and navigation

- `src/app/onboarding/index.tsx` exposes `/onboarding` and supplies the completion callback.
- `OnboardingScreen` owns the current page, press guard, announcements, scroll position, and responsive stage layout. It anchors the rounded panel above the bottom safe area and lets it overlap the art. On short viewports or when text expands, the content scrolls vertically.
- `OnboardingHero` renders the supplied hero above the scenery. The first slide reserves space for the native Healthy Check wordmark and tagline. Subsequent artwork fades in unless system reduced motion is active.
- `OnboardingLandscape` combines gradient mountains, hills, reusable shrubs, and two wave layers on a 390 × 570 viewBox. The landscape fills the entire stage at every viewport width.
- `OnboardingPanel` reserves enough space for the tallest slide's copy at the current width and text size. The panel, pagination, and CTA stay in place across slides. The heading includes the current page number for assistive technology.
- `advance-onboarding.ts` allows one advance per transition window and one completion. CTA labels in order are **Get Started**, **Next**, **Next**, **Get Started**. The controls are CTA-driven. Swiping and in-carousel System Back were proposed in the design and are outside this implementation.

The final CTA calls `router.replace('/(auth)/welcome')` through the route callback. The parallel Authentication branch owns that destination. After integration, the app entry router can decide when to open `/onboarding` after checking restored session state. The completion callback is the boundary for recording a completion flag if product approves a persistence policy. First-run and logout-repeat policy remain open.

## Verification

- `npm run lint` and `npx tsc --noEmit` passed.
- `node --test tests/*.test.cjs tests/*.test.mjs src/features/onboarding/__tests__/*.test.cjs` passed all 12 tests, including the three onboarding tests for sequential advance, rapid-press suppression, and one-time completion.
- Expo Metro exported the Android and iOS bundles with all four hero PNGs.
- Chrome rendered all four slides at 390 × 844, 320 × 568, and 430 × 932. The browser check exercised image transparency and dimensions, full-width scenery, page headings, pagination, reachable CTAs, rapid presses, and the final `/(auth)/welcome` URL. Reduced motion was enabled for the narrow and tall runs. The approved light artwork and white panel are used across system appearances.
- After pinning the panel, Chrome reported identical panel, title, and CTA positions across all four slides at 375 × 812 and 320 × 568. A 375 × 812 run with enlarged panel text also passed. These viewport checks did not reproduce native iOS safe-area insets.
- Android and iOS device rendering, native text scaling, VoiceOver, and TalkBack remain unverified. The Authentication Welcome screen requires the parallel branch for end-to-end verification.

## Visual differences

The supplied heroes restore the photographic Welcome portrait and dimensional illustrations on the other three slides. The newly composed landscapes are approximate interpretations of the approved mockup. On small screens the rounded panel can cover the lower edge of the portrait. Text wrapping and stage height vary with the viewport and system text size.
