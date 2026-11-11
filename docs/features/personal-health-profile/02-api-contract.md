# API contract

**PROPOSED — NOT BACKEND VERIFIED.** The frontend uses an in-memory mock. Route names and transport DTOs below are proposals.

## Types and presence

`ProfileValues` contains `displayName: string`, `birthYear: number`, `gender: Gender`, `heightCm: number`, `weightKg: number`, and `activityLevel: ActivityLevel`. `ProfileDto.values` stores sparse normalized values. `ProfileSnapshot` carries `profile: ProfileDto | null` and an opaque aggregate `revision`, including when no profile exists. Presence and all-fields-empty remain distinguishable.

`Gender` values are `male`, `female`, `other`, `prefer_not_to_say`. `ActivityLevel` values are `sedentary`, `lightly_active`, `moderately_active`, `very_active`. Labels are separate. Gender unset is absent from persistence. Display name is trimmed and must be 1–50 characters when supplied. Birth year is an integer from 1900 through the current year, height 20–300 cm, and weight 0.3–500 kg.

`ProfileDraft` uses text values for inputs, with empty string as blank and invalid text preserved. F1 omits truly empty fields. Whitespace-only entered input is invalid. F2 omits unchanged keys and uses `null` to explicitly clear a previously saved field. The FE repository accepts raw candidate strings so both valid and invalid changes can reach the mock's conditional decision. The real adapter must agree on a wire encoding that preserves that semantics. If BE requires numeric wire values, define a protocol for locally rejected fields that still checks concurrency before returning validation or claiming partial success.

## Operations

| Capability | Proposed HTTP | Request | Response |
| --- | --- | --- | --- |
| Verified profile | GET /api/me/health-profile | Optional `attemptId` query | 200 `{ snapshot, attempt? }`; absent is `snapshot.profile: null` |
| F1 create | POST /api/me/health-profile | `{ fields, attemptId }`; idempotency key | 201 confirmed result; 409 already exists; 422 field errors |
| F2 update | PATCH /api/me/health-profile | `{ patch, expectedRevision, attemptId }`; idempotency key | 200 full or partial result; 412 stale revision; 422 no valid changed fields |
| Invitation eligibility | GET /api/auth/me or equivalent | Authenticated session | Account and explicit decision or eligibility |
| Invitation decision | PUT /api/me/profile-invitation | `{ decision: "skipped" | "completed" }` | 200 recorded decision, idempotent per account |

Create with no provided fields returns `skipped` in the mock. The controller handles it as Auth-owned Skip without a profile request. Invalid F1 input blocks the entire write. Backend must enforce uniqueness per authenticated account and all-or-nothing create. F2 checks expected revision atomically with the write even from absence, then applies only valid changed fields. F2 saves no invalid value and leaves unmentioned fields untouched. With no effective changes, the controller sends no write. A confirmed partial result includes the saved snapshot, applied field keys and rejected field errors. An all-invalid attempt returns field errors. Reject all changes on revision mismatch before applying any field. A read-before-write check alone cannot enforce these guarantees.

## Read and write results

The controller has a separate loading state. Verified reads carry a snapshot, possibly absent or empty. Failed reads carry network or authentication status. Confirmed invalid sessions route through Authentication. Transient auth uncertainty preserves the draft where possible. Write results include confirmed success, partial success, validation-error, conflict, unconfirmed, network-error (only known pre-dispatch or known not applied), unauthorized, no-changes and skipped.

An unconfirmed write retains its attempt ID and draft. A subsequent verified GET can include a final receipt for that ID and the current snapshot. Matching values alone do not establish authorship. A terminal receipt can confirm a full or partial write, or establish that no write occurred. If the latest revision differs from the confirmed receipt or from the edit base after a definitive non-write, show the refreshed state and require a new explicit edit. An unresolved receipt keeps writes blocked. For production, agree on per-account idempotency, terminal receipts and retention, late-arrival handling and read consistency. Do not retry a timed-out write with a new key while its outcome remains unknown.

Invitation decisions remain Auth-owned. The local prototype records only an account-scoped decision, independent of the profile contents. Confirmed creation and explicit Skip resolve it. Abandoning the form leaves eligibility pending. Empty or cleared profile values do not reset a decision.
