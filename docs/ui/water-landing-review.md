# Water Tracking landing review

Reference: `../design/water-intake-tracking.png` from the repository root. This implementation is a **design-system exercise**, not a production hydration flow. It intentionally omits TabBar, cross-screen navigation, persistence, and server data.

## Conventions exercised

- `ThemedText` now accepts named typography roles. Screen copy and metrics use that shared component instead of local font sizes.
- The hero, quick-add surface, and history use semantic light/dark colors, shared radii, spacing, and `shadows.card`. Repeated shadow softness was adjusted in the theme.
- The Water Tracking roles `waterTrack`, `waterPanel`, and `waterPanelEdge` were added to the semantic palette. The ring geometry and screen width live in `layout` tokens.
- Header, hero, ring, and quick-choice sizing were consolidated in `layout` tokens so density can be tuned without one-off screen overrides.
- The native splash background now uses the light `background` value. Expo requires a literal in `app.json`, so keep that configuration value synchronized with the theme when it changes.
- Quick-add choices expose selected state and pressed feedback. The CTA validates a custom amount and updates the visible metric and history locally. The progress ring follows the calculated percentage.
- Decorative bottle and bubbles use local artwork geometry; they remain hidden from accessibility. The progress value and unit have a separate accessible summary.

## Visual assessment status

The composition follows the reference's hierarchy: small overline, large hydration title, pale aqua progress card, white quick-add surface, and intake history. Exact gradients, bottle illustration, shadow blur, and vertical density remain **provisional** until an iOS and Android screenshot can be compared side by side with the reference. Browser screenshot capture was unavailable in this environment because computer-use URL policy blocked the available Windows browser. Review both schemes, narrow phones, and enlarged text when screenshot tooling is restored; refine repeated differences in `src/theme/` first.
