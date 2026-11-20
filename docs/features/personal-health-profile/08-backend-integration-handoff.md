# Personal Health Profile API handoff

The Mobile app uses the shared JWT HTTP client for these endpoints. The server derives the account from the access token. Responses contain only that account’s profile.

| Method and path | Request | Response |
| --- | --- | --- |
| GET /api/me/health-profile | Optional `attemptId` query parameter | 200 `{ snapshot, attempt? }`. A verified empty state has `snapshot.profile: null`. |
| POST /api/me/health-profile | `{ fields, attemptId }` | 201 `{ kind: "success", snapshot }`, 200 `{ kind: "skipped" }` for empty creation, 409 `{ kind: "conflict", snapshot }` when a profile already exists, or 422 `{ kind: "validation-error", errors }`. |
| PATCH /api/me/health-profile | `{ patch, expectedRevision, attemptId }` | 200 `{ kind: "success", snapshot }`, `{ kind: "partial-success", snapshot, applied, errors }`, or `{ kind: "no-changes" }`. A stale revision returns 412 `{ kind: "conflict", snapshot }`. Invalid-only changes return 422 `{ kind: "validation-error", errors }`. |
| PUT /api/me/profile-invitation | `{ decision: "skipped" \| "completed" }` | 200 `{ decision }` with the persisted state. Skip preserves completed. An invalid decision or completion without a saved profile returns 422. |

Login, registration and GET /api/auth/me include `profileInvitation` in the existing user object. New accounts start as `pending`. Accounts predating invitation storage are treated as `skipped`. First creation saves `completed` in the same account update. Skipping creates no profile.

## Values and errors

A snapshot is `{ profile, revision }`. A present profile is `{ id, values, updatedAt }`, with sparse values and an ISO-8601 update timestamp. Treat the revision as opaque, including at absence. Clearing the last field leaves the profile present with empty values.

| Field | Accepted values |
| --- | --- |
| displayName | 1–50 characters after trimming |
| birthYear | Whole year from 1900 through the current year |
| gender | male, female, other, prefer_not_to_say |
| heightCm | 20–300 cm |
| weightKg | 0.3–500 kg |
| activityLevel | sedentary, lightly_active, moderately_active, very_active |

Mobile sends form candidates as strings. The API also accepts JSON numbers for numeric fields and returns those fields as numbers. Omit fields to leave them untouched. Send explicit `null` in PATCH to clear a value. Create validates all supplied fields before saving. PATCH checks the revision before validation, applies valid changed fields together, and identifies them in `applied` on partial success. `errors` maps rejected field names to `INVALID_VALUE`, which Mobile presents as localized field guidance. Profile operations have no effect on Water or Sleep goals.

Validation and conflict responses use the existing problem JSON format with the result fields shown above. The app uses the existing authentication and refresh flow for 401 responses and treats 401/403 as an authorization failure when the request cannot proceed. A lost or failed write response remains unconfirmed.

## Write verification

The optional write `attemptId` accepts up to 128 characters. The server records the most recent successful profile write with the profile. A read with its matching `attemptId` returns the latest snapshot and a success or partial-success result. A later successful write replaces that receipt. Rejected, skipped and no-op requests have no receipt. The server does not replay responses for duplicate attempt IDs. A missing receipt cannot establish that a request failed. The editor offers verification without automatically resubmitting an unconfirmed write.
