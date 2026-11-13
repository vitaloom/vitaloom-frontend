# Sleep Journal API Contract

F1 uses the [backend Sleep Journal contract](../../../../vitaloom-backend/docs/features/sleep-journal/contract-reconciliation.md). The shared HTTP client adds /api and authenticates requests with the existing Bearer session.

| Method and path | Result |
| --- | --- |
| POST /api/sleep/v2/sessions | 201 and the saved session |
| GET /api/sleep/v2/sessions | 200 and { sessions }, optionally filtered by inclusive from/to statistical days |
| GET /api/sleep/v2/sessions/{id} | 200 and the saved session |
| PUT /api/sleep/v2/sessions/{id} | 200 and the updated session |
| DELETE /api/sleep/v2/sessions/{id} | 204 |

The adapter sends uppercase type, method and feeling values. Duration drafts send exact integer minutes and the selected end day. Range drafts send both civil times, one reference timezone and any explicit offset selection. The response contains the saved day and minutes, plus the saved timezone, civil times and resolved instants for RANGE.

Only a successful mutation refreshes subscribed reads and triggers the success flow. A failed write displays an error and lets the user reload records. A network failure can occur after a server commit. The app does not automatically retry a write after a network failure. The shared client may retry a request following a 401 after refreshing the same account's token.

Only the documented SLEEP_NOT_FOUND response maps to a verified missing record. A failed list request stays an error. The HTTP adapter maps the complete list to the existing Journal view. The paging and evidence interfaces remain available to development fixtures.

## Deferred — Post-MVP

- Transaction-based concurrency guarantees
- Optimistic locking
- Idempotency keys
- Operation receipts
- Unknown-outcome reconciliation
- Cross-device conflict resolution
- Offline synchronization

Concurrent updates use last-write-wins. Concurrent overlapping creates may pass the sequential overlap check. These temporary limitations differ from BR-F1.13–15. The approved use-case specifications remain the source for the deferred behavior. F2 goals, statistics, Insights, consent and AI are outside this API.
