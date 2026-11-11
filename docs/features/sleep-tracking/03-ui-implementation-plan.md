# Sleep Tracking UI Implementation Plan

**Goal** Deliver the six selected Sleep designs, journal, record and goal actions, and Sleep content for the HIR weekly report with an in-memory repository.

**Architecture** Keep Expo Router route wrappers thin. Feature screens use a focused read and mutation controller over the typed Sleep repository. Confirmed writes refresh mounted views. The mock derives summaries and evidence from one account-scoped confirmed history. Reuse app chrome, sidebar and design tokens.

**Stack** Expo SDK 58, React Native, TypeScript, existing Expo Router and react-native-svg. See [source analysis](01-source-analysis.md) and [proposed contract](02-api-contract.md).

## Sequence and ownership

1. Inventory and reconcile rules, approved artwork, Auth and Statistics. Document the proposed contract before screen code.
2. Establish domain models and repository types. Add tests for 1–1440 minutes, future values, DST gaps/overlaps, half-open time intervals, immutable range timezone, date grouping and historical goals. Build deterministic fixtures, revisions and write receipts.
3. Build Home, Record, Journal, record detail and Goal. Use the existing authenticated Stack, shared Health Metrics Sidebar and native-compatible controls. Keep one record draft with separate method fields. Only navigate after acknowledgement.
4. Compute mock evidence by catalog rules. Build filterable insights, evidence detail and versioned optional AI fixtures. Compose Sleep weekly metrics and week navigation without adding a parallel app-wide reports system.
5. Run standalone Node tests, typecheck, lint, Expo export and runtime smoke when available. Record limitations and the mock replacement point.

## Navigation

- `/sleep` remains the app's Sleep entry, with Sleep-specific children for Record, Journal, Goal and Insights.
- Record → confirmed save → Home. Journal → record detail → shared edit form or confirmed delete. Goal writes stay within Goal and refresh Home.
- An insight link carries its code, period context and evidence version. Source records open the scoped Journal. Weekly links open the same evidence detail.
- `/sleep/weekly` hosts Sleep report content pending a global HIR-UC-002 owner route. Current Statistics keeps its existing scope.

## Review focus

Check exact-minute round trips and DST ambiguity, retries of unknown outcomes, simultaneous range writes, deleted/stale record conflicts, missing or unverified data versus zero, change invalidation, consent and weekly eligibility, and small-device form access.
## 2026-11-11 incremental audit and implementation

| Reference | Existing behavior | Incremental work |
| --- | --- | --- |
| 7 · Journal | Confirmed day groups, source-evidence scope, pagination, detail and record routes | Add illustrated header, compact record summaries, and an exact statistical-day filter using the existing repository query. |
| 8 · Detail | ID-based read, editable record, revision-aware delete confirmation | Add a summary and labeled stored fields, with timestamps and reference zone confined to timed records. Coordinate edit and delete recovery on the same record. |
| 9 · Edit | Shared form, exact prefill, validation and reconciliation | Group controls in illustrated mint/white layout. Confirm leaving a dirty draft, preserve confirmed navigation, and recover stale/deleted records. |
| 10 · Goal | Confirmed target, proposed 8-hour default draft, validation and historical removal | Add current goal artwork, bounded hour/minute selectors, visible input rules and reference action hierarchy. |
| 11 · Insights no data | Successful list read can return `no-data` | Add illustrated state and existing record/home actions. Keep loading, errors and unverified evidence separate. |
| 12 · Insights insufficient | Catalog candidates carry policy-specific eligibility | Show category requirements from the read result, with a recording action. Keep eligible insights and repair the sparse fixture for the default week. |

The nested Sleep stack, create/edit route wrapper, feature repository, and existing semantic theme roles support the incremental work. New art is mapped once in the existing feature asset module.
