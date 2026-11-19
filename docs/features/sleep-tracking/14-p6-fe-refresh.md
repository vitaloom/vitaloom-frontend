# P6-FE-REFRESH — Sleep AI lifecycle

Implementation date: 2026-11-16. Delivery gate: **blocked pending isolated UI E2E**.

## Scope and implementation

This unit follows the Business AI content guidelines, P6 runbook and FE AI behavior handoff. It changes no API contract or business eligibility calculation. Repository discovery was assigned to one context reader; implementation, integration and validation belong to the coding agent. The queue runner owns Git delivery and independent review.

1. Refresh evidence on route focus, native app resume, web visibility/window focus, repository notifications and an observed reporting-date change. Recent and Detail clear their visible snapshot during revalidation. Reply generations reject obsolete routes/accounts and reads that cross the reporting-day boundary. There is no midnight alarm, polling or cooldown timer: an idle foreground screen revalidates at the next focus, mutation or observed date change.
2. Keep only pending AI promises in a WeakMap keyed by the authenticated repository session. Story additionally keys by the complete displayed report; Explanation keys by the requested insight/evidence identity. Returning to a matching pending operation rejoins it. Leaving a screen removes its UI subscriber without cancelling the HTTP operation. Completed results are removed; the Backend remains responsible for cache, cooldown, full candidate fingerprints and validate-before-publish. App suspension/offline execution is not promised.
3. Repository notifications invalidate pending generations for Journal, Goal, reference-zone and confirmed consent changes, including changes while the originating view is absent. A day change also rejects obsolete completion. Requests from different account/session repository objects never combine. Existing authenticated HTTP session guards continue rejecting retired account responses.
4. Story requires verified current-day evidence with a READY non-A01 highlight and enabled/available server consent. It starts after evidence loads. Explanation remains explicit-tap-only; focus may rejoin pending work but never starts an Explanation. Current Detail readiness, supported code and fingerprint checks still govern display. No new explanation codes or UI design were introduced.

The changed ownership is limited to the Sleep read hook, the two AI components, the pending-operation helper and the consent notification in the HTTP repository. Focused regressions exercise request sharing, mutation/consent invalidation, account isolation, D→D+1, focus/blur/resume and web event cleanup with deferred promises. The event tests use a controlled hook harness; they do not substitute for rendered UI E2E.

## Executed validation

Commands run in `vita-loom-mobile` unless indicated otherwise. No paid provider or production data was used.

| Command | Result |
| --- | --- |
| `node --test tests/sleep-*.test.cjs` | Passed 101 tests, including 9 lifecycle regressions and HTTP consent invalidation. |
| `node --test tests/sleep-ai-refresh.test.cjs` | Initial 8 lifecycle regressions passed; the final Sleep suite also passed the added web regression. |
| `node node_modules/typescript/bin/tsc --noEmit` | Passed. |
| `node node_modules/expo/bin/cli lint` | Passed after resolving the two new hook dependency warnings. |
| `node --test tests/heart-rate-date.test.cjs` | Known unrelated baseline reproduced: 6 passed, 1 failed at line 51; expected `/on or before/`, received `orderDates`. No Heart Rate changes. |
| Backend: `$env:MAVEN_OPTS='-Dmaven.repo.local=D:/prj/vita-loom/temp/sleep-p6-maven/repository'; mvn -o -DskipTests package` | Passed; packaged current local Backend main `63b2b51ba50587ea6715009b73b0f22dc1afaedf`. Tests explicitly skipped for this build. |
| Backend: `mvn -o '-Dtest=SleepAiEvidenceIntegrationTest' test` | Passed 8 tests, including HTTP/Statistics/fake-provider publication, stale evidence, consent and concurrent requests. This is MockMvc integration, not UI E2E. |
| Workspace: `docker info --format '{{.ServerVersion}}'` | Failed: Docker daemon named-pipe access denied in this sandbox. |

## Handoff and remaining gate

The required isolated UI E2E against the built Backend is **NOT RUN**. Docker access prevents provisioning the disposable MongoDB used by the existing UI runtime. Native/iOS visual QA is also not run. These missing checks keep this unit blocked; the passing focused tests and Backend integration do not establish a rendered UI pass.

Next action: rerun from an environment with Docker access, launch the current-main Backend in the dev fake-provider configuration with disposable MongoDB and isolated Redis, and run the actual Expo HTTP UI through Recent → Detail → explicit Explanation, navigation during delayed requests, evidence/consent/account changes and day rollover. Assert zero Explanation calls on focus and zero timer-driven AI calls. Keep credentials synthetic and output sanitized. Then hand the unstaged scoped diff to the queue runner for exact-commit independent review. No task records, phase ledger, runner or queue files were edited.
