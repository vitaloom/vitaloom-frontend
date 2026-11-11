# Sleep Tracking

This folder documents the frontend-only Sleep tracking implementation.

1. [Source analysis](01-source-analysis.md)
2. [Proposed API contract](02-api-contract.md)
3. [UI implementation plan](03-ui-implementation-plan.md)
4. [Asset mapping](04-asset-mapping.md)
5. [Screen behavior and scenario mapping](05-screen-behavior-mapping.md)
6. [Test report](06-test-report.md)
7. [Implementation report](07-implementation-report.md)
8. [Backend integration handoff](08-backend-integration-handoff.md)

Open the authenticated Sleep entry at /sleep. See the test report before attempting simulator or web smoke tests. Repository data in this phase is in-memory mock data. It does not synchronize across app restarts or devices.

## 2026-11-11 supplement

Journal, Detail, Edit and Goal use the existing Sleep stack. Insights now includes verified empty and category-specific insufficient-data states. Two standalone PNGs are mapped to native views with Soft Wellness mint, teal and neutral surfaces.

See the [source update](01-source-analysis.md), [screen behavior](05-screen-behavior-mapping.md), [verification](06-test-report.md), [file inventory](07-implementation-report.md) and [backend handoff](08-backend-integration-handoff.md).
