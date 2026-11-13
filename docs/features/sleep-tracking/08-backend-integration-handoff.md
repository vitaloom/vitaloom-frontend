# Sleep Journal backend handoff

F1 uses the authenticated [Sleep Journal CRUD API](02-api-contract.md) through SleepRepository.

## Local setup

1. Start MongoDB and the backend with the repository's usual application database and JWT settings. Standalone MongoDB and replica sets are supported. Sleep Journal works with the shared Mongo transaction flag disabled.
2. Set mobile EXPO_PUBLIC_API_BASE_URL to an origin the device or emulator can reach, without the /api suffix. For Expo Web, include the web origin in backend CORS settings.
3. Start Expo and sign in. Record a duration-only session and a range, reopen them from Journal, edit one and confirm deletion. Restart the app and sign back in to verify the remaining record. Use another account to check isolation.
4. For development fixtures, set EXPO_PUBLIC_SLEEP_MODE=mock and restart Expo. EXPO_PUBLIC_SLEEP_SCENARIO selects a fixture scenario. Production always uses HTTP.

On a failed write, reload Journal or Detail to inspect the saved state before submitting again. A timeout can occur after the server saves the change.

The [integration report](09-api-integration-report.md) tracks verification. The [API contract](02-api-contract.md#deferred--post-mvp) lists post-MVP reliability work. F2 stays available through explicit development fixtures.
