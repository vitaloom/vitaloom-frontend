# Sleep Tracking API Contract

**PROPOSED — NOT BACKEND VERIFIED** applies to every path, DTO field, response status and protocol on this page. The existing `PUT /api/sleep/daily` accepts one current Ho Chi Minh City duration per day and lacks account isolation. The proposed session contract needs a separate backend capability.

## Shared boundary

`src/features/sleep/api/sleep-repository.ts` defines the asynchronous product operations. A future adapter uses the shared HTTP client and Auth Bearer session. The server derives account scope from the authenticated principal and authorizes every requested record, report, evidence reference, consent and receipt. A request never supplies an account owner. All dates below are ISO civil dates, UTC instants carry offsets, and a time-range carries one IANA reference timezone. DTOs can differ from repository models after backend review.

Reads return verified payloads or explicit request errors. Journal, Daily, Weekly and Insights distinguish verified absence, insufficient sample, unverified history and stale evidence as applicable. Network or Auth failure never implies absence. Candidate HTTP mappings are 401 expired session, 403 forbidden, 404 absent or inaccessible, 409 overlap/duplicate-key mismatch, 412 stale revision, 422 validation and 503 unavailable. Final status mapping is open.

Writes carry `Idempotency-Key` and update/delete carry `If-Match` (including the current empty Goal revision for set). The key binds account, operation, exact payload and expected revision. Replay of an identical attempt yields the same terminal receipt. Timeout or response loss after send yields outcome unknown, keeps the draft and confirmed views, and uses receipt lookup before another write. A temporarily missing receipt is inconclusive. Retention, pending/finalized distinction and retry window need agreement. A stale or removed entity requires a fresh read and explicit user action. Confirmed changes publish a data version and invalidate affected reads.

## Proposed operations

All rows use the shared authentication, validation/error, conflict/version and retry conventions above. Paths are candidates under `/api/sleep/v2`.

| Operation | Request → response | Consumer and mock mapping |
| --- | --- | --- |
| POST /sessions | SessionWrite → confirmed session ID/revision receipt. Validate kind, feeling, chronology, minutes, end day and overlap in one account transaction. | Record form → `mutate(create-session)` |
| GET /sessions/{id} | ID → confirmed SleepSession or verified absence. | Edit/detail → `getSession` |
| PUT /sessions/{id} | ID, SessionWrite, revision → confirmed ID/revision receipt. Preserve stored timezone when staying in range mode. | Shared entry form → `mutate(update-session)` |
| DELETE /sessions/{id} | ID, revision → confirmed deletion receipt. | Journal detail → `mutate(delete-session)` after confirmation |
| GET /sessions | Inclusive from/to, opaque cursor, page size, optional authorized evidence source selector → JournalPage with snapshot version, verification and next cursor. Stable ordering within a snapshot. | Journal/source records → `getJournal` |
| GET /goal | Optional statistical day → current/effective goal, current revision and history verification. | Goal, summary → `getGoal` |
| PUT /goal | Separate hour/minute components, expected revision → confirmed receipt and effective day. | Goal → `mutate(set-goal)` |
| DELETE /goal | Expected revision → confirmed removal receipt and effective day. Preserve previous days. | Goal → `mutate(remove-goal)` |
| GET /daily/{day} | Civil day → DailySummary with status, nullable total and effective goal, Goal verification and nullable progress. | Home → `getDaily`; consolidated `getHome` is an app repository convenience |
| GET /weeks/{monday} | Monday, optional explicit reference zone and feeling type → WeeklySummary including seven day states, verified coverage, average, eligible insights and Goal attainment. Reject future/invalid periods. | HIR Sleep report content → `getWeekly` |
| GET /insights | Monday, optional explicitly selected zone and feeling type → InsightList with period, candidate identity/status, evidence and data version. | Home/Insights → `getInsights` |
| GET /insights/{code} | Same period context plus expected evidence version → current insight evidence or stale/absent result. | Insight Detail → `getInsight` |
| GET /ai/consent | No payload → current opt-in status. | AI surfaces → `getAiConsent` |
| PUT /ai/consent | Explicit enabled choice and disclosure policy version → consent receipt. | AI surfaces → `mutate(set-ai-consent)` |
| POST /ai/explanations | Insight identity/context and evidence version → versioned validated explanation or ineligible/consent-required/unavailable/stale. Deduplicate on identity, account, policy and evidence version. | Insight Detail → `getAi` with `kind: explanation` |
| POST /ai/weekly-stories | Monday and evidence version → versioned headline, at most two evidence-bound observations and limitations, or explicit unavailable state. Deduplicate on account, period, policy and evidence version. | HIR Sleep report → `getAi` with `kind: story` |
| GET /operations/{attemptId} | Account-scoped attempt key → pending/unknown or terminal confirmation, conflict, validation or rejection. | Write controller → `reconcile` |

## Data and responsibility

- SessionWrite is a discriminated union. Range accepts local start/end with explicit offset choice when repeated and one IANA zone, or a backend-agreed canonical representation of the resolved instants. Duration-only accepts end day and whole minutes with no clock fields. Responses carry statistical day, method, type, duration, optional feeling and revision. Range responses preserve local clock context and UTC instants for exact editing.
- JournalPage carries a verified/partial history signal independent of page length. A stale cursor must restart from the first page. For source records the adapter must validate evidence membership and authorization at read time.
- Goal state must preserve effective-day history with an explicit absence entry at removal. Server defines the reporting zone, effective day, same-day replacement semantics and whether future/backdated settings are supported. Mock uses the confirmed reporting day and no backdating.
- Daily and weekly aggregates include every confirmed valid session type. Progress uses verified historical goal and confirmed total. Weekly average divides by days with records. Coverage uses elapsed calendar days in the current week and seven in closed weeks. Ordinary metrics remain available with AI disabled.
- Insights carry catalog code (legacy aliases map to A01–A04), category, period, eligibility/status, coverage, sample, measures, source IDs, limitations and evidence version. Backend owns analytics computation, verification, privacy, and publication. Mock calculations are isolated from screens.
- AI may receive only minimal approved evidence after explicit consent. Backend owns claims validation, policy/version binding, evidence links and provider failure. Privacy review covers disclosure text, withdrawal, retention and deletion. No AI provider is configured in the frontend.
- Open wire decisions include DST offset representation, canonical error envelope, pagination and period limits, reporting zone, revision granularity, consistency across reads, and mutation receipts and replay retention.
