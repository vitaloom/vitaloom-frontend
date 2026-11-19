# Sleep visual experience redesign

Status: proposed implementation; rendered-screen approval remains pending.

The shared `SleepSevenDayChart` now serves Recent Sleep and the A01 calendar.
Recent Sleep labels each recorded bar with its exact duration. A01 uses green
dots for verified recording days. Both show dates as dd/MM and use a gray moon
inside a dashed circle for verified missing days. Recent Sleep displays a separate
question-mark state when verification is unavailable. Device review is pending.

## Scope

This handoff covers the Sleep Insights list, the shared Insight Detail route for A01 Recording Days, and Recent Sleep. API contracts, navigation, eligibility, AI consent, and server-owned evidence remain unchanged.

## Visual audit and applied changes

| Area | Before | Decision | Applied change |
| --- | --- | --- | --- |
| Insight list cards | Generic icon; locked cards showed only a lock; repeated card shape | REDESIGN | Topic-specific native icons, semantic titles, muted locked treatment, and a small secondary lock badge. |
| Insight header | Hero art floated below a large header | ENHANCE | Existing wellness art remains the header anchor with the responsive SleepPage composition. |
| A01 detail | Generic summary plus ring and calendar with repeated count copy | REDESIGN | Recording Days hero combines moon artwork, period context, ring numerator/denominator, and a compact verified calendar. |
| Recent hero | Average and coverage had weak hierarchy | ENHANCE | Average Sleep is dominant with existing moon/cloud artwork; coverage remains secondary evidence. |
| Recent chart | Seven expanded date rows repeated the chart | REMOVE_REDUNDANCY | Daily Sleep Duration keeps seven native cells, unit-bearing values, missing markers, scope/sample annotation, and a compact legend. |

## Component and asset decisions

`SemanticInfoCard` extends the existing Sleep UI primitives and owns an icon slot, title, body, state tone, and optional interaction. Existing `sleepArt` PNGs remain decoration only. Live chart bars, ring values, calendar states, and missing markers remain native and data-bound.

## VEX checklist

- VEX-G01–G03: semantic titles, topic identity, and hierarchy implemented.
- VEX-G04–G06: values, units, denominators, locked semantics, and missing/unverified states remain server-bound.
- VEX-G07: existing mapped Sleep assets reused; no screenshot crops or new runtime assets.
- VEX-G08–G11: responsive token-based layout, accessibility labels, progressive evidence disclosure, and no clinical claims addressed in code.
- VEX-G12: lint, TypeScript, Sleep tests, and diff checks passed. Native runtime screenshots were not captured in this pass; iOS, TalkBack, and enlarged-system-text review remain `VISUAL_REVIEW_REQUIRED`.
