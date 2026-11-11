# Screen behavior mapping

The screen references are pending visual acceptance. IDs below refer to their observable states, which share a small number of native layouts.

| Screen | Entry / trigger | Behavior and exit |
| --- | --- | --- |
| PHP-SCR-001 | Sign in with an eligible account, then choose Set up my profile | Enter basics. Continue changes step without saving. Skip goes Home. Back goes to the invitation and discards the draft. |
| PHP-SCR-002 | Continue from Basics | Enter body and activity. Back retains input across both steps. Save checks all fields. A completely empty submission skips. |
| PHP-SCR-003 | Save with any supplied invalid value | No fields are written. Return to the earliest step with invalid fields, show inline errors, and retain input. |
| PHP-SCR-004 | Open Profile with a verified nonempty snapshot | See all six current values. Edit opens a fresh read for editing. |
| PHP-SCR-005 | Open Profile after Skip or clearing every value | Show all six “Not added” values and allow direct edit. |
| PHP-SCR-006 | Edit a verified populated or empty profile | Input values can be cleared. Cancel or Back discards local edits. Save unchanged shows No changes. Invalid-only save shows inline errors. |
| PHP-SCR-007 | Save one valid change with one invalid change | Confirm only the applied fields. Keep the invalid value with its error and keep the new revision. |
| PHP-SCR-008 | Save after another session changed the revision | Write zero fields. Read the latest snapshot and offer Continue updating or Not now. Continue starts from the new snapshot. |
| PHP-SCR-009 | Read fails, or latest profile cannot be verified after a conflict | Show a retry action. Do not display an empty profile or allow a save from unverified data. |
| PHP-SCR-010 | Save acknowledgment is lost | Retain draft with writes blocked. Check current profile reads latest and checks the exact submission receipt. Keep draft returns to the retained form with verification available. |
| PHP-SCR-011 | Repository confirms a full write, including via receipt | Navigate to the existing Profile tab and show a success status for the matching verified revision. |

## Scenario controls

Set `EXPO_PUBLIC_PROFILE_MOCK_SCENARIO` before starting Expo in development. Restart the Metro process and reload the app to reset mock state. An account’s invitation decision is independent and remains stored locally. Use a fresh test account or clear that account’s local decision for repeat setup checks. Sample values exist only in the populated fixture.

| Scenario | How to exercise |
| --- | --- |
| `empty` (default) | Skip to a verified absent profile, or enter values and save. Leave all fields empty for Skip. Enter one valid and one invalid F2 change for a partial result. |
| `populated` | Open Profile to inspect all six fixture values. Clear a field by emptying its input or choosing Clear selection. |
| `load-error` | Skip, open the Profile tab, then retry the first failed read. |
| `unauthorized` | Skip, open Profile, then use the Auth-backed session check. |
| `conflict` | From Profile, change one field and save. The simulated other session creates or changes the profile first. |
| `conflict-refresh-failure` | Same as conflict, with one failed read during recovery. Retry and choose Continue updating or Not now. |
| `validation-failure` | Submit a valid candidate to simulate a field rejected by the repository. |
| `partial-update` | Edit two valid values and save to simulate one repository rejection. |
| `unconfirmed-after-write` | Save a change, then check current profile to confirm the write by receipt. |
| `unconfirmed-before-write` | Save a change, then check current profile to confirm that it was not applied. The same retained draft may now be submitted again. |

Confirm that setup Back preserves values, an invalid setup does not create a profile, and a fresh sign-in after Skip no longer shows the invitation on the same installation. For edit, verify both conflict choices, deliberate clearing, retry after a failed refresh, and the ability to abandon a draft. Verify the tab bar is the existing AppShell tab bar and no Profile operation changes a tracker goal.
