# Backend integration handoff

## A. Proposed capabilities

**PROPOSED — NOT BACKEND VERIFIED.** The frontend currently performs no profile HTTP requests.

| Operation | Method and path | Request and response | Auth and errors | Retry and consistency | Consumer and mock |
| --- | --- | --- | --- | --- | --- |
| Read current profile | GET /api/me/health-profile | Optional `attemptId` query. `{ snapshot: { profile, revision }, attempt? }` | Authenticated self. Distinguish definitive 401/403 from unverified network/5xx. Absent is a verified 200 with null profile. | Safe to retry. Return the current aggregate and any terminal receipt from a read-consistent point. | `useProfileRead` and `useProfileEditor.verify`. Mock returns a defensive copy, and can fail one read. |
| Create first profile | POST /api/me/health-profile | `CreateProfileRequest` carries provided fields and attempt ID. Confirmed 201 contains snapshot. | Authenticated self. 409 existing profile, 422 all validation errors, 401/403 auth. | Account uniqueness plus all-or-nothing transaction. Preserve the original result for repeated keys. A timeout is unconfirmed. | `useProfileEditor.save` setup. Mock checks uniqueness and validates all supplied fields before atomic commit. |
| Update profile | PATCH /api/me/health-profile | `UpdateProfileRequest` carries patch, expected revision and attempt ID. 200 returns saved snapshot, plus applied fields and rejected errors for partial success. | Authenticated self. 412 stale revision, 422 invalid-only, 401/403 auth. No-changes is a distinct outcome. | Check revision before field validation and commit as one atomic operation. Include absent state in the comparison. Insert at most one row on first valid write. Deduplicate by attempt ID. | `useProfileEditor.save` edit. Mock exercises partial, absent, conflict, and receipt outcomes. |
| Read invitation eligibility | GET /api/auth/me or agreed Auth response | Session context with explicit pending, skipped, or completed decision. | Authenticated self, using the existing Auth session lifecycle. | Must agree how preexisting accounts are migrated and avoid deriving eligibility from presence of optional values alone. | `AuthProvider.updateProfileInvitation` currently reads the local account marker. |
| Record invitation decision | PUT /api/me/profile-invitation | `{ decision: "skipped" | "completed" }` and confirmed current decision. | Authenticated self, documented 401/403 and transient failures. | Idempotent on repeat. Agree how profile creation and completed decision commit together, including multi-device and lost acknowledgment. | `AuthProvider.resolveProfileInvitation` currently persists the marker locally. |

Proposed network statuses are illustrative. Where retries are possible, bind an idempotency key to the authenticated account, operation and request contents. Reusing a key with different contents should yield a deterministic error. Define a retention window that covers delayed requests and realistic reconnection. An absent/expired receipt must leave the outcome unknown unless the backend can definitively establish non-application.

## B. Field and result mappings

- `ProfileDto.values` is sparse and normalized. Map agreed enum codes, units, `id`, and `updatedAt`; birth year, height and weight are numeric on reads. Use separate presentation labels. `prefer_not_to_say` is an explicit value.
- `ProfileDraft` stores raw strings. F1 skips a genuinely empty draft. F2 omits untouched/unchanged values and uses `null` to clear. Read-side missing keys map to blanks. Reject invalid draft values without losing them.
- F2's current adapter accepts candidate strings so the revision precondition runs before per-field validation, including invalid-only attempts. Agree whether the wire accepts strings or a structured candidate/validation protocol. A local-only filter that can declare F2 validation before the revision check breaks the approved ordering.
- A partial write returns the saved snapshot, applied keys and rejected field errors. Use stable field identifiers/error codes and map them to inline copy. Never infer applied fields solely from changed values.
- Treat revision as opaque, including at absence. A real adapter may use a strong ETag if response headers and conditional request behavior can be surfaced. The revision advances with any committed profile changes. Explicitly handle clearing the last field on an existing profile as present with empty values.
- Reconciliation uses a verified latest read plus a terminal receipt keyed to the exact submission. Matching field values by themselves do not prove which request saved. If the revision advanced after the receipt, the editor requires fresh values and explicit user action.
- Auth owns decisions independent of profile completeness. Persist across sign-ins, devices and process lifetimes on the backend. A verified profile created elsewhere can resolve setup without overwriting its contents.

## C. Integration replacement points

1. Replace `getProfileRepository` in `src/features/personal-health-profile/api/profile-repository-instance.ts` with the authenticated adapter. Implement `ProfileRepository` from `api/profile-repository.ts`. Replace the development scenario selection and in-memory storage at this composition point.
2. Add transport-to-domain mapping next to the adapter using `types/profile.ts`. Reuse `src/lib/api/http-client.ts`; agree how to expose revision/receipt metadata and preserve safe request identity across auth retry. Classify definite non-writes separately from lost acknowledgments.
3. Replace the local invitation decision helpers in `src/features/auth/store/auth-context.tsx` with agreed eligibility/decision transport. Keep `AuthProvider` and root route ownership. Coordinate confirmed account lock, expired session and temporarily unverifiable session with existing Authentication handling.
4. Keep the screens and the `useProfileRead` / `useProfileEditor` interactions. Adjust only mapping or recovery protocol if the agreed API differs.

## D. Technical decisions

- **Approved behavior:** Six optional values, unique own-account profile, atomic F1, conditional F2 with partial results, independent invitation decision, explicit clears, no blind replay and no tracker-goal changes.
- **FE decisions:** Raw draft strings, sparse saved values, account-keyed process-memory mock, device-local decision marker, explicit verification before save retry, stack routes for setup/edit and existing Profile tab for overview.
- **Awaiting BE agreement:** Routes, field encoding, error schema, aggregate revision including absence, idempotency keys, receipts and retention, decision atomicity, and production authorization classifications.
- **Open:** Migration for accounts predating invitation storage, lost-ack terminality and cross-device behavior, native visual approval, Auth draft retention across temporary session loss, and privacy/consent review before release.

## E. Integration acceptance

- [ ] Approve routes, payloads, normalized values, enums, units, field error codes and account scoping.
- [ ] Verify authentication and refresh, forbidden/locked accounts, temporarily unavailable sessions and draft handling.
- [ ] Verify atomic F1, single-row uniqueness and two simultaneous creates.
- [ ] Verify F2 partial writes, explicit clears, absent-profile initialization and no-op handling.
- [ ] Verify revision mismatch writes zero fields, including an absence-to-presence race and repeat conflicts.
- [ ] Verify uncertain-save recovery for applied, rejected, unresolved and subsequently superseded writes.
- [ ] Verify invitation Skip and completion survive relogin and a second device, including an empty or cleared profile.
- [ ] Run authenticated integration tests and confirm all read/write results map to the existing UI.
