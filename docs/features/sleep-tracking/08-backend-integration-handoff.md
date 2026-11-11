# Backend integration handoff

## A. Current integration status

Sleep UI reads through src/features/sleep/api/sleep-repository.ts and a deterministic in-memory mock selected in src/features/sleep/api/get-sleep-repository.ts. Screen controllers live in src/features/sleep/hooks/use-sleep.ts. No production Sleep HTTP adapter is connected.

The backend currently documents PUT /api/sleep/daily, accepting sleepHours for one record on the current Asia/Ho_Chi_Minh day. It replaces the daily aggregate and does not represent multiple sessions, naps, feelings, historical dates or time-range timestamps. Its contract also flags incomplete Sleep account isolation. This endpoint is not an appropriate replacement for the mock. See the [proposed API contract](02-api-contract.md), which labels every candidate v2 operation PROPOSED — NOT BACKEND VERIFIED.

## B. Proposed backend capabilities

- Authenticated principal-scoped session CRUD with method, type, feeling, revision, reference timezone, exact duration and statistical-day semantics.
- Transactional overlap validation and explicit DST resolution. Preserve the original range timezone and exact instant on edit.
- Verified journal pagination and account-complete history status. Keep empty, partial and unverified history distinct.
- Revisioned effective Goal history, including removal without changing earlier dates.
- Consistent Daily and Weekly aggregates with day status, coverage, historical Goal and data version. Backend is authoritative across devices.
- Insight catalog version and detail reads with evidence IDs, measures, denominators, coverage, limitations and a coherent evidence version.
- Consent-bound optional AI responses linked to exact versioned evidence. Validate generated claims. Current and unverified weeks do not expose an AI Story.
- Terminal operation receipts and idempotency. Matching values from a read do not prove which request succeeded.

Proposed operation contracts and screen consumers are in 02-api-contract.md. Authentication must reuse the shared Bearer HTTP client. The server derives ownership from authenticated identity, never a client-supplied account identifier.

## C. Exact replacement points

1. Replace mock selection in src/features/sleep/api/get-sleep-repository.ts with an authenticated adapter implementing SleepRepository from src/features/sleep/api/sleep-repository.ts.
2. Keep screens on src/features/sleep/hooks/use-sleep.ts. Put DTO mapping, date/time encoding, error classification and request headers in the feature adapter. Reuse src/lib/api/http-client.ts and Auth refresh handling.
3. Preserve confirmed, validation, conflict, rejected and unknown distinctions when implementing receipts and revisions. Keep attempt identity over safe authentication refresh retries.
4. Keep mock scenario selection out of production composition. Add contract and integration tests before replacing mock-based scenario verification.
5. Provide Sleep weekly metrics to the HIR-owned report workflow. HIR controls metric/week selection. Sleep owns Sleep calculations and insight rules. The feature weekly route is provisional until HIR integration.

## D. Decisions for review

**PROPOSED — NOT BACKEND VERIFIED:** candidate /api/sleep/v2 routes, HTTP methods, DTO fields and statuses; Idempotency-Key, If-Match, receipt and retention semantics; pagination consistency; error envelope; DST fold/gap representation; reporting timezone and Goal effective day; transaction boundaries; evidence version scope and read consistency.

**OPEN:** No session resource or verified account-isolation contract exists. Agree identity and authorization before serving private health data. HIR has no mobile report route. Review consent disclosure, withdrawal, AI provider processing and retention with privacy stakeholders. Validate A/B/C thresholds marked proposed in the source catalog. Confirm presentation for unverified and unknown results.

**CONFIRMED BUSINESS RULES:** Sessions are 1–1440 whole minutes. Range times use one retained reference zone and cannot silently resolve DST ambiguity or overlap. Duration-only has no timestamps. Only confirmed writes affect effective data. Goals use 60–1440 minutes in 15-minute steps, and the eight-hour suggestion is not automatically applied. Current or unverified weeks do not show an AI Story.

## E. Integration acceptance

- [ ] Verify authenticated owner-scoped session resources and block cross-account access.
- [ ] Agree request/response fields, date semantics, minute precision, timezone offsets and DST resolution.
- [ ] Test concurrent overlap writes, revision preconditions and stale/deleted conflicts.
- [ ] Agree receipt key scope, identical-payload replay, pending/terminal states, retention and unknown reconciliation.
- [ ] Verify Journal snapshot pagination and history-completeness status.
- [ ] Confirm Goal effective-day behavior for same-day change, removal, timezone and earlier dates.
- [ ] Verify Daily/Weekly totals, denominators and coverage including empty/unverified dates.
- [ ] Validate insight codes, eligibility, evidence IDs, version and limitations against approved thresholds.
- [ ] Approve consent, provider use, response validation, version binding and stale-copy invalidation.
- [ ] Integrate weekly metric content in HIR-UC-002 with HIR retaining workflow ownership.
- [ ] Run authenticated contract tests before replacing mock assertions.

## 2026-11-11 Journal, Detail, Goal and Insights handoff

- **UI COMPLETE / MOCK ONLY** Journal, detail, update/delete, goal and category-specific Insights fallbacks consume the existing `SleepRepository` boundary. Replace the mock selection in `src/features/sleep/api/get-sleep-repository.ts` when a verified HTTP contract is available.
- **PROPOSED** Journal needs account-scoped reads, exact statistical-day bounds, consistent cursors and evidence-source selection. Return stored wake day and reference zone on ranges. Return a verified absence for deleted IDs. Estimated durations carry date and exact minutes.
- **PROPOSED** Validate on the server and include expected revision for edit, delete and goal. Provide explicit overlap, stale and deleted outcomes. Keep writes and evidence invalidation consistent. An uncertain result needs an account-scoped lookup using the same attempt ID. The client coordinates pending edits/deletes per record and preserves drafts for correctable validation failures.
- **PROPOSED** Return confirmed active goal, revision, effective day and historical goals. Return evidence verification, category eligibility and unmet requirements per candidate for Insights. Confirm protocol and field names before replacing the in-memory adapter.
