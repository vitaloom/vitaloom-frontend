# Authentication UI flow implementation

## Source and visual assets

The four approved full-screen WebP references were copied unchanged from the Design repository's `main` branch to [`docs/design-references/authentication/`](../../design-references/authentication/). They are review references, not runtime UI. The first three references share one wellness photo and rounded lower sheet; the fourth shows a separate profile-card illustration.

The runtime hero reuses the frontend's existing transparent [`wellness-stretch.png`](../../../assets/images/wellness-stretch.png), with native mint shapes and a native leaf mark. Its subject and pose differ from the approved photo, so this is a **visual gap requiring design review**, not a faithful reproduction. The profile-card illustration is built from React Native views. No new independent runtime asset was introduced, so there is no feature asset map or `assets/authentication/` directory. All controls and copy remain native and accessible.

## Components and behavior

- `AuthWelcomeScreen` composes one `AuthHero` and `AuthBottomSheet`. The welcome, sign-in, and registration routes select different content over the same composition; the form routes remain deep-linkable.
- `AuthCredentialsForm` uses shared fields/buttons, inline field and API errors, masked passwords with a visibility toggle, required field validation, and a synchronous submission guard. Passwords are passed unchanged. `AuthContext` still normalizes email by trimming and lowercasing.
- Registration accepts exactly Email and Password. `LOGIN_REQUIRED` says the account was created and directs the user to Sign In. Duplicate email, invalid credentials and network errors have distinct copy. No new auth endpoints, mock service, or token handling were added.
- `AuthBottomSheet` uses a rounded safe-area surface, keyboard avoidance, scrollable content, and explicit close/Back behavior. Backdrop tap and swipe dismissal are intentionally absent because their draft-discard behavior remains open. No motion was added, so reduced-motion preferences are respected.
- `ProfileSetupPromptScreen` is an optional invitation after successful token-returning registration. “Set up my profile” opens the existing Profile tab; “Maybe later” opens Home. The Profile tab does not yet contain the full Personal Health Profile onboarding flow.

## Navigation contract

`/onboarding` (parallel branch) → `/(auth)/welcome` → `/(auth)/sign-in` or `/(auth)/register` → authenticated Home, or `/profile-setup-prompt` after successful registration → Profile or Home. Existing sign-in and register URLs remain available. Root session restoration goes straight to Home. `temporarilyUnavailable` retains the existing retry and explicit sign-in recovery screen.

The profile invitation route is guarded as authenticated and by an in-memory `pendingProfileInvitation` marker set only by successful registration. The marker is cleared when either invitation action is chosen and on sign-out. This avoids repeatedly prompting returning sign-ins or restored sessions. `AuthUser` has no persisted eligibility field, so eligibility after returning login cannot be implemented accurately yet. The onboarding first-run and logout-repeat policy also needs product confirmation; this branch does not add persistent onboarding state. Full `/onboarding` integration must be tested after the parallel branch is combined.

## Verification

- `npm run lint` — passed.
- `npx tsc --noEmit` — passed.
- `node --test tests/auth-refresh.test.mjs` — passed (5 tests).
- `node --test tests/auth-form.test.mjs` — passed (2 tests).
- `npx expo export --platform web --output-dir .auth-preview-dist` — passed; generated preview files were removed after verification.
- `node --test tests/web-auth-storage.test.cjs` — unavailable: file absent on this baseline.
- Visual device QA, live backend end-to-end authentication, and the combined onboarding route were not available in this worktree. Expo web preview could not be opened because the local preview port was blocked in the browser environment.

## Integration notes

The Onboarding branch should link its final CTA to `/(auth)/welcome`. Keep its dependency/build configuration changes separate and resolve any route or theme conflicts when integrating. The branch does not edit onboarding, metric features, package files, or API contracts.
