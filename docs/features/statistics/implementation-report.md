# Statistics implementation report

## Source changes

| Location | Change |
| --- | --- |
| `screens/statistics-screen.tsx` | Replaced the single-metric view with the four-card overview. The existing Statistics tab route, shared sidebar, and tab bar provide navigation. |
| `components/statistics-banner.tsx`, `statistics-period-selector.tsx`, `statistics-metric-card.tsx`, `statistics-trend.tsx` | Added responsive artwork, shared reporting controls, accessible metric cards and compact SVG previews. Removed the superseded overview-only `heart-rate-chart.tsx`. |
| `constants/statistics-visuals.ts`, `messages.ts` | Added feature colors and English/Vietnamese copy. Appearance follows the root provider. |
| `data/statistics-period.ts`, `data/statistics-data.ts`, `hooks/use-statistics-metric.ts`, `services/statistics-sources.ts`, `types/statistics.ts` | Added date scope, data transformations, independent reads, and the typed integration boundary. |
| `assets/` | Imported the four metric illustrations plus mint/pink wave and bar artwork from the design repository. Bar artwork appears only as decoration in the banner. Sleep reactions reuse the existing Sleep assets. |
| `tests/statistics-data.test.cjs` | Covers calendar navigation, sample-weighted BPM, and Water average and future-day exclusion. |

All feature paths are relative to `src/features/statistics/` except the test file.

## Behavior

The first visit opens Week. Day/Week and previous/next update all four cards for the same local period. Heart Rate, Steps, Water Intake and Sleep always appear in that order. Future scopes are disabled. Cards push the existing detail destinations, keeping the tab and selected period mounted underneath. Pull to refresh and web refresh request all available metrics. Individual retry targets a failed card. Current observations and partial results remain labeled, and missing buckets remain gaps.

Week Sleep can render recorded nightly durations. Day Sleep shows the recorded feeling and translated explanation when supplied, and uses a neutral message when the feeling is missing. Both Sleep presentations currently render the unavailable state until an authenticated source is available. See the [integration handoff](backend-integration-handoff.md).

## Verification

- TypeScript and Expo lint passed.
- Android and web Expo exports passed. This validates bundling and asset resolution.
- The three Statistics tests passed. The full Node suite passed 76 of 78 tests. The unchanged Heart Rate custom-range test expects English copy where the helper returns a translation key. The unchanged Sleep future-entry test uses the current clock with a hardcoded date and failed once that date became current.
- All eight PNG imports are byte-identical to the design files.
- The web export was exercised in headless Chrome at 390 CSS pixels with local test responses. All four screenshots were reviewed. The browser check covered Week default, Day/Week switching, date arrows, metric order, a Water failure and retry, all four detail routes, and Day selection/date preservation on back. Sleep showed its neutral unavailable state.

The shared app shell uses the app's navigation styling. Card heights can grow for translated text and data states. The banner artwork is decorative and charts reflect available records, so preview shapes and visible values vary from the reference images. Native device layout and screen-reader behavior still require device verification.
