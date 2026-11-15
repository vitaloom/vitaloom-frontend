# Recent Sleep Report integration · P1

**Baseline** 2026-11-14. Mobile `a5d48e2` and Backend `3ea7f3c` on local `feat/sleep-recent-p1` branches, Business `41b534e`. This report supersedes the fixed-week Sleep report behavior described in older design notes.

## P5A Sleep Goal

The authenticated Goal screen reads the server's current effective day. Its optional historical read remains available to day-scoped consumers. The HTTP adapter verifies Goal values and effective dates, sends explicit set and remove requests with the last confirmed revision, and refreshes subscribed reads only after a matching server confirmation. A stale revision asks the user to reload. A rejected or unconfirmed write blocks another edit until the user reloads the confirmed Goal. No Goal mutation is retried automatically.

Sleep Home and Daily compose a Goal read for the matching day. A Goal read failure does not hide verified Journal data and leaves Goal unverified. Daily progress calculation remains outside this integration.

**Mobile verification.** The focused adapter suite passed 16 tests and the Sleep suite passed 73. `node_modules/.bin/tsc.cmd --noEmit` and `npm.cmd run lint` exited 0. On Android API 35 with Expo Go and disposable MongoDB, the authenticated Goal screen left the 8-hour suggestion inactive until Save, saved 8h 15m after a wheel change, kept the Goal on cancellation, and removed it on confirmation. The server rejected an invalid duration and unauthenticated requests, and a second signed-in account had empty history. The [P5A task record](../../../../vitaloom-business-docs-and-tools/docs/development-workflow/tasks/sleep-p5a-goal.md) links the local smoke evidence.

**Trace** OW-01–04, OW-44–47, OW-54, BR-F2.1–3/.10–11/.18–19/.22/.38–39, SLT-UC-009, ADR-001 and VAL-REC-01–06/21 plus the Sleep-specific part of VAL-REC-38. [P1 plan](../../../../vitaloom-business-docs-and-tools/docs/technical/sleep-recent-handoff/P1-PLAN.md) · [Backend API contract](../../../../vitaloom-backend/docs/features/sleep-report/api-contract.md)

## Runtime behavior

- The Sleep entry opens `/sleep/recent`. The existing `/sleep/weekly` route points to the same report. Legacy week and timezone parameters have no effect on the server request. The root navigator waits for session restoration before evaluating the incoming protected route. In Statistics, the Sleep entry is available in daily mode.
- `SleepRepository.getRecent()` calls the authenticated shared client at `GET /sleep/recent`. The client prepends `/api`. The adapter validates the seven ordered civil dates, day statuses, explicit nulls, and aggregate/A01 consistency. It displays server metrics and A01. Additive optional `highlights` accepts READY A01/B01 entries in server order, capped at three; A01 uses localized coverage text and B01 opens existing Detail. Older responses without `highlights` continue to render legacy A01. View All opens `/sleep/insights`, including no-data and unverified report states. Account changes retire old session-scoped repository requests.
- `NO_DATA` shows seven missing dates, zero recorded days, and a shortcut to record Main Sleep. `VERIFIED` shows coverage, the recorded-day average, and either Insight Empty or A01. `UNVERIFIED_DATA` shows uncertain dates and any verified individual facts. Transport, API and decoding failures enter the retryable error state. Recent is unavailable in explicit development fixture mode.

## Files

- Routes and UI in `src/app/_layout.tsx`, `src/app/sleep/{recent,weekly}.tsx`, `src/features/sleep/screens/{recent-sleep-report-screen,sleep-screen}.tsx`, `src/features/sleep/messages.ts`, and `src/features/statistics/screens/statistics-screen.tsx`. Retired the weekly screen, weekly report content and week chart.
- Adapter and types in `src/features/sleep/api/{sleep-repository,http-sleep-repository}.ts`, `src/features/sleep/mocks/mock-sleep-repository.ts`, and `src/features/sleep/types/sleep.ts`.
- Checks in `tests/{sleep-recent-repository,sleep-repository-composition}.test.cjs`. Documentation in `02-api-contract.md`, this report and the feature README.

## Verification commands

| Command | Exit | Observation |
| --- | --- | --- |
| Backend `.\mvnw.cmd -B -o "-Dmaven.repo.local=<writable-cache>" "-DargLine=-javaagent:<space-free-cache>/org/mockito/mockito-core/5.23.0/mockito-core-5.23.0.jar" verify` | 0 | 96 passed including 11 F1 Journal Mongo regressions and 5 Recent Mongo integration tests. Build succeeded. |
| Mobile `node --test @checks` with `$checks = Get-ChildItem tests -Filter 'sleep-*.test.cjs' \| Select-Object -ExpandProperty FullName` | 0 | 56 passed, including DTO, error, account-switch and route assertions. |
| Mobile `.\node_modules\.bin\tsc.cmd --noEmit` and `npm.cmd run lint` | 0 each | TypeScript and Expo lint passed. |
| Mobile full `node --test` over the `tests/*.test.*` files | 1 | 104 passed, one baseline failure. The isolated `node --test tests/heart-rate-date.test.cjs` also exited 1 because the validator returns `orderDates` and this test expects English text. |
| `python -u smoke_recent.py` from the local `temp/p1-runtime` workspace folder | 0 | Chromium drove the actual Expo routes, authenticated requests, Journal writes and reads, and Mongo verification. |

## Local smoke

The smoke used `docker run --rm -d --name vitaloom-p1-mongo-20261114 -p 127.0.0.1:27029:27017 mongo:8.0.29-noble`, followed by `docker exec vitaloom-p1-mongo-20261114 mongosh --quiet --eval 'print(db.version())'`. Docker startup and the ready-version check exited 0. Backend ran via `.\mvnw.cmd -B -o -DskipTests spring-boot:run` with test-only JWT secrets, `SERVER_PORT=18080`, `SERVER_ADDRESS=127.0.0.1`, and Mongo pointed at the disposable container on port 27029. The application selected `vitaloom_db` via its configured database property. Set `EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:18080` and `EXPO_PUBLIC_SLEEP_MODE=http` and run `.\node_modules\.bin\expo.cmd start --web --localhost --port 8081 --no-dev`. Both servers were ready during the smoke.

To repeat manually, sign in, open Sleep → Recent Sleep, and record eligible days using the Journal form. Compare the report to the account's `sleep_sessions` documents. At the start of the week, use isolated historical fixtures for boundary cases so Journal writes stay within their actual eligibility window.

Chromium at a 390 × 844 viewport made three real authenticated Journal POSTs, all HTTP 201. MongoDB 8.0.29 in the isolated `vitaloom-p1-mongo-20261114` container returned the same account-scoped DURATION dates and minutes. Expo rendered seven dates, four “Not recorded” slots, 3/7, 7h 20m, and A01. The captured `GET /api/statistics/sleep/recent` returned HTTP 200 with `Cache-Control: no-store`. An unauthenticated request returned HTTP 401 with `application/problem+json`.

The contract moved to `GET /api/sleep/recent`. The same browser smoke, `python -u smoke_recent.py`, exited 0 against the new path with Expo on port 18081 and the Backend JAR on 18080. It reproduced the values below, the old Mobile deep link, the change after deletion, account isolation, unverified history, and the visible error on a Mongo decode failure. The backend regression confirms that the former API path returns 404.

| Statistical day | MongoDB MAIN minutes | Report day status |
| --- | ---: | --- |
| 2026-11-08 to 2026-11-11 | — | `NOT_RECORDED` / null, four dates |
| 2026-11-12 | 420 | `RECORDED` |
| 2026-11-13 | 450 | `RECORDED` |
| 2026-11-14 | 451 | `RECORDED` |

```json
{
  "period": {"start": "2026-11-08", "end": "2026-11-14", "timeZone": "Asia/Ho_Chi_Minh"},
  "dataStatus": "VERIFIED",
  "recordedDays": 3,
  "coverageDenominator": 7,
  "averageMinutesPerRecordedDay": 440,
  "insights": [{"code": "A01", "status": "READY", "sampleDays": 3, "denominatorDays": 7}]
}
```

The excerpt omits the `days` array shown in the table. Test account identifiers and credentials are omitted from the evidence.

The authenticated cold link `/sleep/weekly?week=2000-01-03` returned the same report. A confirmed Journal DELETE returned 204, after which the UI showed 2/7, an average of 435 minutes, and Insight Empty. After sign-out, account B saw 0/7 and the recording action. A malformed MAIN fixture in that disposable account produced `200 UNVERIFIED_DATA` with all seven days uncertain and no aggregate or A01. A fixture that failed Mongo decoding produced `500 INTERNAL_ERROR` and the visible retryable error state.

## Android smoke · 2026-11-15

Android API 35 x86_64 with Expo Go 58.0.5 ran in HTTP mode through ADB reverse and the local Backend JAR with an isolated MongoDB 8.0.29. The authenticated app submitted a Main Sleep Duration Only record through Journal (`201`). Two other eligible dates were seeded through the real Journal API. MongoDB and the Recent response agreed on 420, 450 and 300 minutes, with four missing dates, coverage `3/7`, average `390` minutes and A01 READY. The app displayed `6h 30m`. The authenticated Recent request returned `200` and `Cache-Control: no-store`.

The legacy Mobile deep link showed the same report. Another native Journal deletion returned `204`, then a fresh report showed `2/7` and withheld A01. A separate authenticated account saw `0/7` and the recording action. Disposable Mongo fixtures resulted in `UNVERIFIED_DATA` with seven uncertain cells and no aggregates, then `500 INTERNAL_ERROR` with the retry action. The retry rendered the updated unverified state.

Evidence in the local `temp/p1-runtime` workspace includes sanitized HTTP records, the account-scoped Mongo projection, Android UI snapshots and a verifier. `python verify_p1_native.py` passed. iOS was not run.

## Remaining work

- Remote GitHub Actions CI for the P1 candidate **NOT RUN**. Backend full local verification ran 96 tests with real MongoDB Testcontainers. Mobile Sleep tests (56), lint and typecheck passed. The Mobile full suite retained the unchanged Heart Rate localization assertion failure.
- The production history audit is pending. Coverage verification assumes the scoped MongoDB Journal is the available canonical history. If a deployment has incomplete legacy imports, verify that history before rollout.
- P2 owns B01, All Insights and Detail. P5 owns Goal history and the remaining catalog. P3/P4 own consent-gated fake-provider flows. P6 owns real-provider and cache/cooldown hardening.

## P3 Mobile consent and Recent Story

The Recent screen reads persisted consent from `GET /api/sleep/ai/consent` after its report has loaded. The opt-in control appears only when the server marks the feature available and saves changes with authenticated `PUT /api/sleep/ai/consent` and `{enabled}`. The preference remains visible when consent is off, while Story content stays hidden. The client calls `GET /api/sleep/recent/story` only when consent is enabled, the server feature is available, and the verified current report includes READY B01 evidence. Consent and Story loads are focus-scoped so results from a previous screen focus or account repository are discarded.

The Story payload is limited to two evidence-linked observations. Fallback status is labeled as an evidence summary and is not presented as generated text. Consent copy describes the limited evidence scope and the development fake provider. Current Story observations link to the existing Insight Detail route, which fetches current evidence.
