# Main Sleep implementation handoff

The [merged business PR #28](https://github.com/vitaloom/vitaloom-business-docs-and-tools/pull/28) at `2b0b1de` is the requirements baseline. Mobile uses the authenticated [Sleep Journal API](02-api-contract.md).

## Screen and data changes

| Area | Behavior |
| --- | --- |
| Sleep Entry | Sends `MAIN` automatically. RANGE, DURATION, reference timezone, and optional feeling use the existing controls. Wake/end date selection allows unrecorded days from Monday through today in Vietnam. A backfill older than the latest record displays a read-only notice before saving. |
| Journal and Detail | History stays available. The server's account-wide `editable` flag controls Edit and Delete. A duplicate-day rejection provides a path to the existing record. Legacy Nap is visible as read-only. |
| Edit and Delete | Edit reuses the entry form and keeps the saved RANGE timezone. Delete uses the existing confirmation. Both send the loaded version. After confirmation, focused Journal, Detail, Sleep Home and Dashboard reads refresh through the shared repository. |
| Sleep Home and Dashboard | Both display today's recorded Main Sleep duration from Journal. They distinguish verified missing data from unavailable data. |
| Development fixture analytics | Daily and weekly results use unique Main Sleep records. Weekly averages divide by recorded days. INS-S04 uses the eligible Main Sleep RANGE per day with the existing timezone and DST conditions. Conflicted duplicate days withhold affected aggregates. Goal and versioned AI eligibility remain in the existing fixture flow. |

The main files are `http-sleep-repository.ts`, `mock-sleep-repository.ts`, `sleep-analytics.ts`, `sleep.ts`, the Sleep date and validation utilities, the calendar/record pickers, the write notice, the Journal/Detail/Entry/Insight screens, and the Dashboard Sleep tile under `src/features/home/`. The four `tests/sleep-*.test.cjs` suites exercise the domain, analytics, HTTP adapter and account-scoped repository composition.

## Validation mapping

| Rules | Scenarios | Evidence |
| --- | --- | --- |
| BR-F1.1–7, 10, 14, 17 | VAL-SLT-01–06, 14–15 | Adapter MAIN payload, eligible dates, cross-method duplicate rejection, and backend timezone, overlap and concurrency checks |
| BR-F1.7, 12–13, 18–19 | VAL-SLT-07–13 | Journal eligibility, backfill read-only, version conflicts, latest-only changes and Vietnam week rollover |
| BR-F2.1–3, 9 | VAL-SLT-16–17 | Same-day Journal read, verified empty state, unique Main duration, progress and recorded-day average |
| BR-F2.14–19, 32, 37 | VAL-SLT-18–19 | Fixture timing, timezone/DST eligibility and evidence-version checks |
| BR-F1 legacy | VAL-SLT-20 | Read-only Nap compatibility and withholding duplicate-day statistics. See the backend handoff for the index audit. |

## Verification and rollout

- `node --test tests/sleep-*.test.cjs` passed 50 tests. The full mobile suite ran 99 tests, with 98 passing and one existing failure in `tests/heart-rate-date.test.cjs`. That assertion expects English prose, while the unchanged Heart Rate validator returns the localization key `orderDates`.
- TypeScript `tsc --noEmit`, `npm run lint`, and `expo export --platform web` passed.
- A live Node smoke test ran the real mobile HTTP adapter against the built Spring Boot app and disposable MongoDB. It covered authenticated MAIN creation, duplicate rejection, read-only backfill, conditional update and stale delete, successful delete, latest promotion, daily missing state, refresh notifications, and rejection of NAP writes.
- Native device interaction and visual QA remain open. Use the [local setup](08-backend-integration-handoff.md) to run the Journal flow on device.
- The [backend implementation report](../../../../vitaloom-backend/docs/features/sleep-journal/implementation-report.md) covers the deployment data audit and the single-backend-writer limit for cross-record checks. F2 Goals, Weekly Reports, Insights, and AI remain available through development fixtures.
