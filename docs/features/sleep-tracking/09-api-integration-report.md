# Sleep Journal Basic CRUD integration

This report records the original CRUD integration. See the [Main Sleep handoff](10-main-sleep-handoff.md) for the current business rules, migration status and verification.

The original F1 integration was simplified in place. Mobile uses authenticated HTTP to create, list, open, edit and delete Sleep sessions. The backend persists records with ordinary MongoDB operations and scopes each lookup to the JWT subject. The existing screens, input fields and delete confirmation are retained.

See the [API contract](02-api-contract.md) for the five endpoints, DTO mappings, and deferred reliability work. The [local setup](08-backend-integration-handoff.md) works with standalone MongoDB and the transaction flag disabled. No legacy data migration is required for the Sleep session collection. Any old development receipt and guard collections are unused and were left in place.

The adapter displays request failures as errors and never falls back to production fixture data. A successful write refreshes subscribed reads. F2 data remains unavailable or unverified in HTTP mode. Explicit development mode retains the existing fixtures and their compatibility methods.

## Verification

- The backend suite exercised real HTTP create and detail reads on a disposable standalone MongoDB 8 server with transactions disabled. Integration tests covered authenticated CRUD, account isolation, input validation and date filtering.
- Mobile TypeScript, Expo lint and focused Sleep/Auth tests passed. The focused tests cover HTTP mapping, confirmation and refresh behavior, error versus empty results, account changes and fixture selection.
- The existing Heart Rate suite failure is outside F1. Its date test expects English text where the validator returns a localization key.
- Native interactive CRUD and app-restart smoke testing remain open. Backend persistence was verified by reading a record back from MongoDB in a separate HTTP request.

## Deferred — Post-MVP

- Transaction-based concurrency guarantees
- Optimistic locking
- Idempotency keys
- Operation receipts
- Unknown-outcome reconciliation
- Cross-device conflict resolution
- Offline synchronization

Concurrent updates can overwrite each other, simultaneous range writes can race, and a failed response can follow a successful commit. These are intentional MVP limitations relative to BR-F1.13–15. The approved business specifications were retained.
