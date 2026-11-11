# Source analysis

Target checkout is `D:/prj/vita-loom/vita-loom-mobile`, branch `personal-health-profile` at `cb60dfd` before changes. The clean target checkout already has a CodeGraph index. Design and business files were read from the sibling repositories on D:.

## Sources inspected

- Design `personal-health-profile/README.md`, `BEHAVIOR.md`, `ASSET_MAPPING.md`, `screen-manifest.json`, the eleven PNGs (also reviewed in the catalog contact sheet) and matching HTML/CSS in `sources/`. The manifest uses `source/` in some links.
- Design `assets/personal-health-profile/README.md`, `asset-manifest.json`, and `profile-hero-photorealistic.png`; root `BEHAVIOR_STANDARD.md` and `ASSET_MAPPING_STANDARD.md`.
- Business `docs/usecase_spec/personal-health-profile/00-module.md`, both F1/F2 `rules.md`, and `PHP-UC-001_khoi-tao-ho-so-ca-nhan.md`, `PHP-UC-002_xem-ho-so-ca-nhan.md`, `PHP-UC-003_cap-nhat-ho-so-ca-nhan.md`.
- FE `AGENTS.md`, architecture/UI foundation docs, package and TS config, root/index/tab routes, Authentication provider, credential form, invitation, Auth storage/API and shared HTTP client, current profile placeholder, shared theme and icon components, Water repository/validation/hooks and Node tests. Expo SDK 58, Router protected routes, and Expo Image documentation consulted.

## FE architecture and reuse

Expo Router owns route files under `src/app`. The root stack uses `AuthProvider` and protects tabs and the invitation. Registration with tokens previously opened `/profile-setup-prompt`; sign-in and session restoration typically opened Home. Invitation state was transient and “Set up” opened the placeholder Profile tab. The tab bar and existing sign-out are retained. The old placeholder owns no domain data. Profile edit belongs in a sibling protected stack route, leaving tabs to the AppShell.

Reuse `ThemedText`, `useTheme`, `WellnessIcon`, and semantic theme tokens, plus the existing safe-area package and Expo Image. Auth's text fields demonstrate inline error presentation. Profile forms use feature-local React state and pure validators. Water illustrates isolated domain, repository, hook and route layers. `src/lib/api/http-client.ts` is the future authenticated transport boundary. Tests use Node's runner and a local TypeScript transpilation hook. The package exposes `lint`; the repo prescribes `tsc --noEmit` and has standalone test files.

| Screen | Use case | State |
| --- | --- | --- |
| 001 | PHP-UC-001 | Setup basics |
| 002 | PHP-UC-001 | Setup body and activity |
| 003 | PHP-UC-001 | Atomic validation failure, draft preserved |
| 004 | PHP-UC-002 | Verified populated |
| 005 | PHP-UC-002 | Verified absent or all values cleared |
| 006 | PHP-UC-003 | Edit from verified snapshot |
| 007 | PHP-UC-003 | Confirmed partial save with rejected fields retained |
| 008 | PHP-UC-003 | Concurrent update, show verified latest and ask how to proceed |
| 009 | PHP-UC-002/003 | Failed read, including a failed conflict refresh |
| 010 | PHP-UC-001/003 | Write acknowledgment unknown |
| 011 | PHP-UC-001/003 | Confirmed result |

## Domain precedence and open points

All six fields are optional. Prefer not to say is an explicit gender value. Use the approved numeric limits and four self-selected activity choices. F1 submits atomically and empty submission skips. F2 allows confirmed partial saves and explicit clears, including from an absent profile. Check the aggregate revision before any F2 validation or writes. No field is a gate to other modules. Ordinary navigation discards drafts. Authentication governs explicit logout and session handling.

The screenshots show sample values and decorative OS chrome, and remain proposed. F1 validation may return the user to Basics when a Basics field is invalid. Unknown saves in either mode use a no-hero surface. Verify reads before labeling a profile empty or offering another save. The app owns tabs and actual back behavior. Body/activity guidance is illustrative. Auth owns the invitation, with local decision storage for this mock phase. Backend eligibility, durable cross-device decisions, reconciliation and native visual review remain open.
