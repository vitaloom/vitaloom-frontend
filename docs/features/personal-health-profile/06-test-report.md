# Test report

## Repository checks

The package exposes `lint`. There is no package script for typecheck or tests. The repository documents the TypeScript command and uses standalone Node tests.

| Check | Command | Result |
| --- | --- | --- |
| Lint | `npm run lint` | Passed |
| Typecheck | `npx --no-install tsc --noEmit` | Passed |
| Full suite | `node --test tests/*.test.cjs tests/*.test.mjs` | 39 passed, including 11 Personal Health Profile tests |
| Diff whitespace | `git diff --check` | Passed |
| Artwork integrity | SHA-256 compare of the source and installed PNG | Both `F9D95594AF0775C90112F98CED94686997955C9DA4F2EEC8C1B95DB2A64A4644` |

The new tests cover empty versus invalid F1 input, accepted ranges and enum membership, single-profile concurrent create, touched and normalized patch comparison, explicit clear, absent-profile initialization, invalid-only and mixed updates, stale writes from absence, refresh failure, distinct authorization/load failure, terminal receipts and defensive snapshot copies. A regression run reproduced five validation or concurrency failures in the initial mock. They passed after correction.

## Expo web checks

Ran Expo web in headless Chrome at 360 × 640 and 390 × 844. The browser intercepted existing login, session refresh and current-user requests with a disposable authenticated fixture. The Profile repository ran in the app. No profile HTTP service was necessary.

| Scenario | Verified behavior |
| --- | --- |
| Empty, 360 × 640 | Opening setup, leaving for the invitation and reentering, two steps and Back retention, atomic validation error, confirmed setup navigation, populated overview, six-field edit, no-changes feedback, partial save with inline error, clearing a value, Cancel discarding draft, repeat sign-in without the resolved invitation |
| Load error, 390 × 844 | Truly empty setup Save routes to Home without profile creation. First Profile read shows retry instead of empty. Retry renders six unset fields and Edit is available. |
| Conflict with refresh failure, 390 × 844 | First save applies none of the draft, retry reads the current snapshot, and Continue starts from fresh values without replay. |
| Lost acknowledgment after write, 390 × 844 | Unknown sheet appears before success. Keep draft retains values and lets the user reopen verification. A verified current read and terminal receipt confirm the exact write. |
| Lost acknowledgment before write, 360 × 640 | Verification proves that no write occurred. The draft remains available and a new deliberate save succeeds. |
| Populated, 390 × 844 | Explicit Skip discards entered setup text and routes Home. The populated fixture remains available through Profile. Edit can clear a saved gender selection. |

Captured and inspected PHP-SCR-001 through PHP-SCR-011 across those viewports. Checked horizontal bounds, scrolling to controls, header Back, accessible control names and inline error presentation. The browser initially exposed a setup completion navigation race. After moving setup into the authenticated stack and resolving invitation state before replacement, confirmed saves reached Profile.

## Manual reproduction

Start the app with the scenario variable in [screen behavior mapping](05-screen-behavior-mapping.md). Use a test Auth session. To run offline in a browser, intercept `POST /api/auth/login` or `POST /api/auth/register` with an `AuthTokens` fixture containing `user: { id, email }`, `accessToken`, `refreshToken` and `expiresInSeconds`. For session restoration, return the token response from `POST /api/auth/refresh` and the fixture user from `GET /api/auth/me`. Keep this interception external to the app. Check each state using the steps in the mapping. Use a fresh fixture ID for an unresolved invitation.

## Native coverage and limitations

No Android emulator, attached device, or iOS simulator was available in this Windows session. Native soft keyboard insets, Android hardware Back, system font scaling and VoiceOver/TalkBack require device checks. Chrome used regular form input and scrolling without an onscreen keyboard. Some web captures show Expo’s development overlay for React SVG/DOM property warnings (`accessible`, `accessibilityElementsHidden`, and `transform-origin`) during AppShell navigation. All six browser scenarios completed. Visual acceptance remains pending.
