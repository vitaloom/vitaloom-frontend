# Water Intake API handoff

> **Status: DRAFT / PROPOSED.** These endpoints and DTOs are a frontend integration proposal only. Their presence here does not mean the Backend currently exposes them. The current feature uses an in-memory mock repository and sends no HTTP requests.

## Domain vocabulary

- Amounts are integer `amountMl` values in millilitres.
- `loggedAt` is an ISO 8601 instant with an explicit offset or `Z`; it is not a localized time string.
- `date` and `weekStart` are local calendar dates in `YYYY-MM-DD` form. The timezone must be supplied so day boundaries are unambiguous.
- The FE mock goal is `2000 ml/day`. The Backend must confirm whether goals can vary by date.
- FE `source` values (`quick-add` or `custom`) are mock/UI metadata and are omitted from the proposed create request unless the Backend later confirms support.

## Proposed endpoints and DTOs

### GET `/water/daily-summary?date=YYYY-MM-DD&timeZone=Asia%2FHo_Chi_Minh`

Returns a daily total and that day's logs.

Proposed response:

```json
{
  "date": "2026-11-05",
  "goalMl": 2000,
  "totalMl": 1500,
  "logs": [
    {
      "id": "log_4",
      "amountMl": 500,
      "loggedAt": "2026-11-05T09:30:00.000Z"
    }
  ]
}
```

The response example illustrates shape only; it is not production data. The FE can derive `percent = totalMl / goalMl * 100` and clamp only the visual ring to 100%. The displayed percentage may exceed 100%. The FE should sort logs newest-first if the Backend does not guarantee ordering.

### GET `/water/weekly-progress?weekStart=YYYY-MM-DD&timeZone=Asia%2FHo_Chi_Minh`

`weekStart` is proposed to be a Monday in the user's local calendar. The response contains exactly seven ascending dates, Monday through Sunday.

Proposed response:

```json
{
  "weekStart": "2026-11-02",
  "weekEnd": "2026-11-08",
  "days": [
    { "date": "2026-11-02", "totalMl": 1200, "goalMl": 2000 },
    { "date": "2026-11-03", "totalMl": 1600, "goalMl": 2000 },
    { "date": "2026-11-04", "totalMl": 1300, "goalMl": 2000 },
    { "date": "2026-11-05", "totalMl": 1500, "goalMl": 2000 },
    { "date": "2026-11-06", "totalMl": 0, "goalMl": 2000 },
    { "date": "2026-11-07", "totalMl": 0, "goalMl": 2000 },
    { "date": "2026-11-08", "totalMl": 0, "goalMl": 2000 }
  ]
}
```

`weekEnd` is convenient but optional: the FE can derive it from `weekStart`. The FE should validate/normalize seven dates and must not present future dates as recorded data.

### POST `/water/logs`

Proposed request:

```http
Content-Type: application/json
```

```json
{
  "amountMl": 250,
  "loggedAt": "2026-11-05T09:41:00.000Z"
}
```

Proposed success: `201 Created`

```json
{
  "id": "log_100",
  "amountMl": 250,
  "loggedAt": "2026-11-05T09:41:00.000Z"
}
```

Quick Add captures `loggedAt` when the user presses its confirmation CTA. Detailed Entry uses the instant selected by the user. The FE validates integer amounts from 1 through 2000 ml and rejects future instants; the Backend must validate independently, including user ownership. `source` is intentionally excluded from the proposed body until Backend support is confirmed.

## Domain and DTO mapping

| FE domain value | Mock repository behavior | Proposed Backend mapping |
| --- | --- | --- |
| `WaterLog.id` | Locally generated unique ID | `id` returned by the create response |
| `WaterLog.amountMl` | Integer millilitres | `amountMl` |
| `WaterLog.loggedAt` | ISO instant | ISO instant |
| `WaterLog.source` | `quick-add` or `custom` metadata | Omitted from DTO by default |
| `DailyWaterSummary.date` | Local calendar date | `date` query/response |
| `DailyWaterSummary.totalMl` | Sum of logs for the local day | `totalMl` |
| `DailyWaterSummary.goalMl` | Fixed `2000` for this FE MVP | `goalMl`, pending Backend goal policy |
| `DailyWaterSummary.percent` | Derived from total and goal | Derived in FE; no response field proposed |
| `WeeklyWaterSummary.days` | Seven local dates, Monday first | `days` array |

## Repository replacement seam

Screens consume the Water feature hook/store, which calls the async `WaterRepository` contract in `src/features/water/services/water.repository.ts`. For a future integration, add an `ApiWaterRepository` implementing the same methods and select it at the repository factory/dependency boundary. Keep screen behavior and domain summaries independent of transport DTOs; map and validate network DTOs inside that adapter. The current implementation remains mock-only: do not add an HTTP client or imply that records reach a server.

## Proposed error handling

These status mappings are suggestions to discuss, not a confirmed Backend contract.

| HTTP status | Possible meaning | Suggested FE response |
| --- | --- | --- |
| 400 / 422 | Invalid amount or time | Show an inline form error and retain input |
| 401 | Missing or expired session | Use the existing auth flow after integration |
| 404 | Requested resource/date unavailable | Follow the confirmed API empty/error behavior |
| 409 | Conflict, if defined | Do not auto-resolve without a Backend rule |
| 5xx / network | Server or connectivity failure | Retain input, explain that saving failed, allow retry |

Do not implement fixed error codes or retry rules until the Backend confirms them.

## Open points for Backend confirmation

- Confirm base path, endpoint names, and authentication method.
- Confirm whether timezone is a query parameter, header, or comes from the user's profile, and whether it can change for historical queries.
- Confirm timestamp normalization and local-day boundaries, Monday week start, and future-day policy.
- Confirm minimum/maximum amount and whether an amount above the daily goal is valid.
- Confirm whether `goalMl` varies by date or has an effective date.
- Confirm whether `source` is accepted or persisted.
- Confirm response ordering, history pagination, and retention.
- Confirm create response shape, validation/error codes, and idempotency behavior for retries.
- Confirm data retention, offline behavior, and multi-device consistency for any later release.

## Current limitations

This draft does not confirm that any endpoint exists. The FE MVP has no Backend calls, durable storage, offline queue, or synchronization. Mock data is lost when the app process restarts. Client-side validation does not replace Backend validation.
