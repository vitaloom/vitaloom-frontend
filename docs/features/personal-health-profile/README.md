# Personal Health Profile

The existing Profile tab shows six optional self-reported fields. The Auth invitation opens two-step setup, and the Profile tab opens edit. The feature uses an account-scoped in-memory repository. Auth stores only the invitation decision locally.

1. [Source analysis](01-source-analysis.md)
2. [Proposed API contract](02-api-contract.md)
3. [UI implementation plan](03-ui-implementation-plan.md)
4. [Asset mapping](04-asset-mapping.md)
5. [Screen behavior and scenario instructions](05-screen-behavior-mapping.md)
6. [Test report](06-test-report.md)
7. [Implementation report](07-implementation-report.md)
8. [Backend integration handoff](08-backend-integration-handoff.md)

Run `npm run web` or `npm run android` from the mobile repository. The module does not need a profile service. Access to the regular authenticated routes still uses the app’s existing Auth flow. For offline browser verification, intercept the existing Auth requests with a test session. See the test report for commands and scenario details.
