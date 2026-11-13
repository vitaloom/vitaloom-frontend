# Sleep Journal API Contract

F1 uses the [backend Sleep Journal contract](../../../../vitaloom-backend/docs/features/sleep-journal/contract-reconciliation.md). The shared HTTP client adds /api and authenticates requests with the existing Bearer session.

| Method and path | Result |
| --- | --- |
| POST /api/sleep/v2/sessions | 201 and the saved session |
| GET /api/sleep/v2/sessions | 200 and { sessions }, optionally filtered by inclusive from/to statistical days |
| GET /api/sleep/v2/sessions/{id} | 200 and the saved session |
| PUT /api/sleep/v2/sessions/{id} | 200 and the updated session |
| DELETE /api/sleep/v2/sessions/{id} | 204 |

The adapter always sends `sleepType: "MAIN"` and uppercases the method and optional feeling. Duration drafts send exact integer minutes and the selected end day. Range drafts send both civil times, one reference timezone and any explicit offset selection. The response contains `editable`, the saved day and minutes, and the saved timezone, civil times and resolved instants for RANGE. `editable` is based on the account's greatest Main Sleep day and the server's current calendar week in `Asia/Ho_Chi_Minh`. Legacy Nap responses remain readable with `editable: false`.

PUT and DELETE use a quoted `If-Match` containing the record's last confirmed `confirmedAt` timestamp. A 409 can indicate `SLEEP_DAY_ALREADY_RECORDED`, `SLEEP_WEEK_LOCKED`, `SLEEP_RECORD_NOT_LATEST`, `SLEEP_OVERLAP`, or `SLEEP_STALE`. The app can open the occupied day after a duplicate or reload after an eligibility or version conflict. The adapter treats HTTP 400/422 as validation, 401 as an authentication failure after shared session handling, and `404 SLEEP_NOT_FOUND` as a missing record.

Only a successful mutation refreshes subscribed reads and triggers the success flow. A failed write displays an error and lets the user reload records. A network failure can occur after a server commit. The app does not automatically retry a write after a network failure. The shared client may retry a request following a 401 after refreshing the same account's token.

Only the documented SLEEP_NOT_FOUND response maps to a verified missing record. A failed list request stays an error. The HTTP adapter maps the complete list to the existing Journal view. The paging and evidence interfaces remain available to development fixtures.

The same-day Journal query supplies today's recorded Main Sleep duration for Sleep Home and the Dashboard. A verified empty day displays a missing-record state. F2 Goals, Weekly Reports, Insights, consent and AI remain development fixtures. See the [Main Sleep handoff](10-main-sleep-handoff.md) for verification and rollout details.
