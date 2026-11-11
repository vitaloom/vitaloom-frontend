# Screen behavior mapping

This matrix traces business rules through navigation and repository calls. Result terms describe the typed frontend boundary and do not promise a wire protocol.

| UC / rule | Screen and user action | State transition | Repository operation | Error and alternate handling |
| --- | --- | --- | --- | --- |
| SLT-UC-004, BR-F1.1–4 | Home → Record. Select Main/Nap, range or estimated duration, dates, hours/minutes and optional feeling. | Draft → local validation → saving → confirmed Home, validation, conflict, rejection or unknown. | mutate(create-session), then getHome after confirmation | Retain draft on validation/rejection. Preserve arbitrary exact-minute input. Unknown blocks success and offers receipt reconciliation. |
| BR-F1.5–9, F1.14 | Submit time-range session, including concurrent overlap. | Candidate → disjoint and resolvable, validation or conflict. | mutate(create-session) | Compare confirmed range intervals using half-open endpoints. Require DST resolution. Duration-only has no inferred interval. |
| BR-F1.7–11 | Edit method, end day, date or time. Change timezone only when a duration-only record becomes a new range. | Confirmed revision → edit → new confirmed revision or preserved old record. | getSession, mutate(update-session) | Existing range zone is immutable. Reject future dates and unresolved DST. Clear old timestamps when converting to duration-only. |
| SLT-UC-005, BR-F1.10–12 | Home → Journal. Inspect grouped statistical days and Main/Nap entries. Open entry. | Loading → verified page, verified empty or unverified/error. | getJournal with optional date/cursor/source IDs | Failed read is retryable and is not an empty journal. Multiple sessions remain separate. |
| SLT-UC-006, BR-F1.13/18 | Journal → detail → Edit. Save a new version. | Displayed revision → draft → confirmed revision, conflict/rejected/unknown. | getSession, mutate(update-session) | Stale revision preserves stored entry. Reload and require explicit action. Unknown remains unresolved pending receipt check. |
| SLT-UC-007, BR-F1.19 | Detail → Delete → explicit confirmation. Cancel or confirm. | Confirmed entry → cancel leaves entry, or pending → confirmed removal/conflict/rejected/unknown. | mutate(delete-session) only after confirmation | Never optimistically remove. Deleted elsewhere is conflict, not success. Unknown preserves entry until receipt confirms deletion. |
| SLT-UC-008, BR-F2.5–6 | Home → Goal. Draft hours/minutes and explicitly save/update, or confirm removal. | No Goal or confirmed historical Goal → draft → confirmed change/removal or unchanged prior state. | getGoal, mutate(set-goal), mutate(remove-goal) | Suggestion is draft only. Validate 1–24h, quarter-hours and 24:00 cap. Failed write never changes confirmed Goal. |
| BR-F2.1–3/9/18 | View Home total and Daily Progress. | Loading → verified recorded/no-data/future summary or unverified/error. | getHome or getDaily | Missing or unverified history is not zero. No progress without confirmed data and verified effective Goal. |
| SLT-UC-009, BR-F2.22–32 | Home → Insights. Filter All, Patterns, Feelings or Discoveries. Select eligible item. | Loading → verified cards, category no-data/insufficient, unverified/stale/error. | getInsights, getInsight | Omit ineligible claims while preserving independent ready items. C02 stays disabled. Home shows at most one eligible featured insight. |
| BR-F2.30, 34–37 | Detail. Review period, evidence, denominator, coverage and limits. Optionally request explanation or source records. | Version checked → deterministic evidence plus fixture/unavailable/ineligible/stale optional AI. | getInsight, getAiConsent, getAi, getJournal(sourceIds) | AI unavailable or consent off leaves evidence. A version mismatch hides old AI and refreshes evidence. Recheck source history. |
| HIR-UC-002, HIR BR-F2.1–8, Sleep BR-F2.3/18/33 | Home → Weekly Report. Navigate week and open eligible insight details. | Loading → current/closed verified metrics with coverage or empty/unverified/error. | getWeekly, optional getAiConsent and getAi(story) | Monday–Sunday; reject future weeks. Missing dates are excluded from the average and shown as missing, not zero. Only a closed verified week plus advanced insight and consent can request AI Story. Report is read-only. |

## Primary flows

- Home → Record → confirmed result → refreshed Home.
- Home → Journal → detail → edit or confirmed delete → Journal.
- Home → Goal → confirmed set/update/remove → refreshed Home.
- Home → eligible Insights → evidence detail → source Journal.
- Home → Sleep weekly content through provisional /sleep/weekly. HIR owns the eventual cross-metric workflow.

## Alternate and exception flows

Reads preserve loading/error separately from verified empty and allow retry. Invalid local values retain the draft and show field feedback. DST ambiguity requires user resolution. Touching intervals are allowed and overlapping intervals conflict. A rejection retains the prior confirmed record. Stale revisions require fresh data and renewed action. Confirmed deletion follows the confirmation dialog. Unknown writes remain unresolved until receipt reconciliation. Confirmed changes invalidate dependent summaries and evidence versions. AI consent and HIR route integration remain open.

## Scenario fixtures

Intended mock scenarios include mixed-method history, verified empty journal, multiple sessions per day, duration-only records, absent Goal, invalid draft, overlap, stale/deleted revision, rejection, unknown outcomes both applied and unapplied, insufficient evidence, unavailable AI, consent off, stale insight and unverified history. These are in-memory scenarios and do not establish offline storage or server validation.

## 2026-11-11 supplemental screens and states

| ID and route | Actions, validation and recovery |
| --- | --- |
| SLT-SCR-006 · `/sleep/journal` | Group confirmed sessions by stored statistical day. Calendar opens an exact-day filter. Invalid dates keep the current query. All dates clears the filter. Verified empty history, an empty selected date, loading, unverified reads and failures have separate feedback. Source-evidence mode keeps its version check. Add Sleep opens `/sleep/record`. |
| SLT-SCR-007 · `/sleep/journal/[id]` | Use confirmed record fields. Only ranges show start, wake and reference timezone. Delete prompts for confirmation and sends the captured revision. Stale results require reload and deliberate reconfirmation. A deleted result returns to Journal. An uncertain delete can be checked on Detail. |
| SLT-SCR-008 · `/sleep/record?id=<id>` | Prefill the shared form, validate the active method, keep the saved range zone, and resolve ambiguous offsets explicitly. Validation and overlap keep the draft. Cancel and back prompt before discarding a dirty draft. Stale/deleted results use confirmed reload or Journal recovery. An uncertain edit can be checked in the editor, and confirmed save dismisses to refreshed Detail. |
| SLT-SCR-009 · `/sleep/goal` | Show the confirmed goal or inactive suggestion. Select 1–24 hours and 00/15/30/45 minutes. Only 00 is valid at 24 hours. Invalid drafts leave confirmed state intact. Removal prompts, preserves earlier history and refreshes on confirmation. |
| SLT-SCR-003 · `/sleep/insights` | A verified empty selected period displays NO_DATA with Record Sleep and Sleep Home actions. Verified history with insufficient eligible evidence for the selected category displays INSUFFICIENT_DATA with actual policy summaries and Continue Tracking. Both recording actions use `/sleep/record`. Ready cards, loading, failure, stale and unverified states retain distinct behavior. |

A pending update or delete blocks a second mutation for that record. Its originating screen owns reconciliation and the confirmed destination. Confirmed mutations refresh subscribed reads and the views that regain focus.

## 2026-11-11 date and time picker follow-up

- Record and Edit open a month calendar for Start date, Wake date, and the duration-only End date. Time-range calendars use the active reference timezone to limit future dates. Duration-only uses the reporting day.
- Start time and Wake time open hour (00–23) and minute (00–59) wheels. Sleep duration opens hours (0–24) and minutes (00–59). The selected pair is applied together, and Cancel keeps the previous value. Changing a clock or day clears the previous DST offset so the existing ambiguity check can ask again.
- Goal uses scrolling wheels for hours (1–24) and minutes (00, 15, 30, 45). The existing validator rejects nonzero minutes at 24 hours and preserves the confirmed goal on failure.
- Journal opens the calendar for its exact statistical-day filter. All dates clears the filter. The selected date in Insights and Weekly Report resolves to its Monday-based week. The week arrows remain available.
