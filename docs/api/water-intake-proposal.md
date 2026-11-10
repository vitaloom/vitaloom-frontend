# Water Intake API — implemented MVP contract

This document supersedes the earlier FE-only proposal. The authoritative contract is in [`vitaloom-backend/docs/features/water/api-contract.md`](../../../vitaloom-backend/docs/features/water/api-contract.md). Water requests use the existing authenticated `apiRequest` client with `EXPO_PUBLIC_API_BASE_URL` as the backend origin, so paths below are prefixed by `/api` on the wire. Responses are plain JSON; failures use `{ "error": { "code": "...", "message": "..." } }`.

Amounts are integer millilitres. `loggedAt` is an absolute ISO 8601 timestamp with an offset or `Z`. `date` and `weekStart` are local calendar dates (`YYYY-MM-DD`), interpreted using the required IANA `timeZone` query parameter derived from the device. `source` is FE metadata only and is not sent to the backend.

Because the backend does not persist `source`, retrieved logs have no reliable `quick-add` versus `custom` distinction. The adapter assigns the FE domain's `custom` value when reading them; that value must not be presented as a historical source claim.

## GET `/water/daily-summary?date=2026-11-06&timeZone=Asia%2FHo_Chi_Minh`

Returns `200 OK` with `{date, goalMl, totalMl, percent, logs}`. The fixed MVP goal is 2,000 ml; `percent` may exceed 100. Logs are ordered newest first and contain `{id, amountMl, loggedAt}`. A day with no logs returns zero total and percent, and an empty `logs` array. The progress ring alone caps its visual fill at 100%.

## GET `/water/weekly-progress?weekStart=2026-11-02&timeZone=Asia%2FHo_Chi_Minh`

`weekStart` must be Monday. Returns `200 OK` with `{weekStart, weekEnd, days}`, where `days` contains seven ascending `{date,totalMl,goalMl}` entries through Sunday. Days without data have zero total. Selecting a day in the chart triggers a daily-summary request for that date.

## POST `/water/logs`

Send `{ "amountMl": 250, "loggedAt": "2026-11-06T09:15:00+07:00" }`. `amountMl` must be an integer from 1 to 2000; `loggedAt` cannot be in the future. The user ID comes from the backend security context. Success is `201 Created` with `{id,amountMl,loggedAt}`; the returned timestamp is normalized to UTC. The FE omits `source` from the request.

Quick Add captures the timestamp only when Add Log is pressed. Detailed Entry submits the selected past instant. Both flows guard against double submission, show errors on rejection, and refresh Water summaries only after success. The API adapter never silently falls back to mock data.

## Errors and retry

`400` means invalid date, week, timezone, amount, or timestamp. `401` uses the existing token refresh flow. Network and server errors leave the form available for retry and must not produce a success message. This MVP has no server idempotency key; the FE does not automatically retry a POST when its outcome is unknown.

## Changes from the draft

- Confirmed `/api/water/*` routes with Bearer authentication and per-user data isolation.
- Added required `timeZone` on both GET requests, using the device's IANA timezone.
- Confirmed a fixed 2,000 ml goal, server-provided `percent`, newest-first logs, and seven Monday–Sunday days.
- Confirmed `201` create response, amount range, future-time validation, and the existing error envelope.
- Replaced the in-memory mock repository with the authenticated API adapter; no mock fallback remains.
- The old backend documentation's unimplemented `POST /api/water-intakes` proposal with `intakeId` is superseded by these routes. The current MVP does not provide server-side replay safety.
