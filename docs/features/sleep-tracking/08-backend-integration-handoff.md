# Sleep Journal backend handoff

F1 uses the authenticated [Sleep Journal CRUD API](02-api-contract.md) through SleepRepository.

## Local setup

1. Audit legacy duplicate Main Sleep rows using the [backend implementation report](../../../../vitaloom-backend/docs/features/sleep-journal/implementation-report.md). Start MongoDB and the backend with the repository's usual application database and JWT settings. Sleep Journal supports standalone MongoDB with the shared transaction flag disabled.
2. Set mobile EXPO_PUBLIC_API_BASE_URL to an origin the device or emulator can reach, without the /api suffix. For Expo Web, include the web origin in backend CORS settings.
3. Start Expo and sign in. Record a duration-only session and a range on different eligible days. Open both from Journal, edit the one with the greatest statistical day, then confirm its deletion. Verify the other record becomes editable if it is still in the current week. Use another account to check isolation.
4. For development fixtures, set EXPO_PUBLIC_SLEEP_MODE=mock and restart Expo. EXPO_PUBLIC_SLEEP_SCENARIO selects a fixture scenario. Production always uses HTTP.

On a failed write, reload Journal or Detail to inspect the saved state before submitting again. A timeout can occur after the server saves the change.

The [Main Sleep handoff](10-main-sleep-handoff.md) tracks current verification. The [API contract](02-api-contract.md) lists the current request and response behavior. F2 Goals, Weekly Reports, Insights and AI stay available through explicit development fixtures.
