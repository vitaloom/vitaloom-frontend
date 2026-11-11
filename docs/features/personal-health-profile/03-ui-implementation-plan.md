# UI implementation plan

1. Add the pure domain model and typed repository with deterministic scenarios, then verify validation, revision handling and receipts with Node tests. Account selection comes from Auth and the mock stores profile data only in memory.
2. Add shared feature controllers and install the single hero PNG. Reuse existing auth and tab ownership. The setup route is part of the protected invitation flow, the overview is the existing Profile tab, and the edit route sits in the authenticated stack. Keep route wrappers thin.
3. Use native scrollable, safe-area and keyboard-aware layouts. Compose a rounded decorative image-backed hero for setup and verified overview variants. Setup shares one draft, has local Back/Continue transitions, and routes to invalid fields when atomic validation fails. Setup steps and validation use the same component.
4. Render the six verified overview rows in two grouped cards, including unset values. Route into edit from both verified states. Keep sign-out reachable from overview. A load error gets its own retry state.
5. Edit uses a verified base and computes normalized changes from touched fields. Clearing a saved value is explicit. Keep rejected drafts after partial save. Conflict and unknown acknowledgment use accessible decision sheets. Read latest before resuming, keep writes blocked during uncertain verification, and never replay a stale draft. Confirmed success uses the same overview with a status notice.
6. Verify the pure and integration paths with Node tests, the repo typecheck/lint, and compact/tall UI smoke checks where runtime support permits. Finish source-to-screen mapping, implementation report and handoff, recording what actually ran.

## Ownership

Foundation owns `types/`, `api/`, `mocks/`, and `utils/`. Authentication owns only the invitation decision and existing entry flow. The orchestrator owns controllers, route wiring and verification. Feature UI composes the controllers via typed props and owns no adapter. No dependency changes are required.
