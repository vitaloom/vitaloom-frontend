# Sleep Tracking Test Report

## Results

Checks ran against a writable snapshot of the mobile checkout using its existing dependencies and generated Expo Router types. The untouched snapshot baseline passed 39 tests and typechecked before implementation.

| Command | Result |
| --- | --- |
| `node --test tests/*.test.cjs tests/*.test.mjs` | 62 passed, 0 failed. The 23 new Sleep tests cover the domain, repository and analytics. |
| `node node_modules/typescript/bin/tsc --noEmit` | Passed with regenerated Expo Router declarations. |
| `npm run lint -- --no-cache` | Passed with no warnings or errors after cleanup. |
| `node node_modules/expo/bin/cli export --platform web --output-dir .sleep-web-check` | Passed. Metro built the web entry, server renderer and Sleep routes. |
| `node node_modules/expo/bin/cli export --platform all --output-dir .sleep-export-verified --max-workers 2` | Passed for Android, iOS and web with `EXPO_OFFLINE=1` and the process temporary directory inside the writable snapshot. |
| SHA-256 comparison of the seven copied PNGs against their design originals | All seven matched. |

The first all-platform export failed during Hermes bytecode generation with exit code 6 using the sandbox-generated temporary path. The repeated export with a writable task-specific temporary path emitted Android and iOS Hermes bundles and the web export. No repository configuration or dependencies changed. Node reported existing module-type warnings in the Auth tests.

## Automated coverage

- Calendar boundaries, exact minutes, invalid dates and future input. DST gaps, repeated times with explicit offsets, elapsed duration through clock changes and historical timezone offsets with seconds.
- Discriminated duration-only writes, immutable saved range timezone, editing between methods, session overlap and adjacent intervals.
- Confirmed CRUD, stale/deleted conflicts, account isolation, versioned journal pagination and source record filtering.
- Unknown outcome reconciliation, immutable captured payloads, idempotent receipts and revalidation after an intervening overlapping write or update.
- Goal component constraints, prior effective goal preservation and progress above 100% when supported by confirmed data.
- Missing and unverified records remain distinct from zero. Weekly average uses recorded days and current coverage uses elapsed days.
- INS-S01–S04 via A01–A04, A05, B-series and eligible C-series. Tests include S04 ties, explicit timezone selection, a transition week and a representative spanning a prior-week transition.
- Unverified/stale evidence and consent/unavailability gates. AI Story eligibility requires a closed verified week with advanced eligible evidence.

## Runtime verification limits

The local Expo server and temporary test Auth stub started. The in-app browser timed out on both loopback addresses. A shell HTTP request returned a socket permission error. Authenticated click-through and screenshot comparison were therefore unavailable in this environment. No connected Android device or iOS simulator was available. Export success verifies bundling and routes. Native interaction, keyboard behavior, appearance, accessibility with a screen reader and visual acceptance remain open.

## Reproducible smoke checks

Start the app from the mobile checkout with `npm run web` or `npm run android` and use a test account. Open Sleep from the shared Health Metrics Sidebar. Create a 1-minute estimated nap and a non-overlapping range, inspect the refreshed Home, and open Journal to edit and delete the test session. Cancel a deletion once and verify the entry remains. Set, update and remove a goal. Open a prior week and a current week to compare coverage, then exercise consent and the demo preview on an eligible completed week. Check source-record links from an insight and reload after editing a linked record.

In a development build set `EXPO_PUBLIC_SLEEP_SCENARIO` to `empty`, `no-goal`, `insufficient`, `unverified`, `stale` or `ai-unavailable` and restart the app to exercise alternate reads. For targeted operation tests use `MockSleepRepository.setNextFault` with `reject`, `stale`, `deleted`, `unknown-before` or `unknown-after`, and `failNextRead` for a read error. No external AI service is part of these checks.
