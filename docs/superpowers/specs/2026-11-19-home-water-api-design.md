# Home Water API Design

- **Intent:** Replace Home's hardcoded Water sample with the authenticated daily summary and show actual intake, goal progress, and individual logs.
- **Goals:** Use the existing Water repository/API; refresh it with Home; show a capped goal progress ring and a same-day intake chart whose vertical scale marks every 500 ml; preserve loading, error/retry, empty, localization and accessibility behavior.
- **Non-goals:** Change the Water API, daily goal rules, persistence, or standalone Water screen; add dependencies.
- **Constraints:** `GET /api/water/daily-summary` owns `totalMl`, `goalMl`, `percent`, and `logs`; local day/timezone comes from the Water repository. The Water chart must display only recorded events and not infer values for missing periods.
- **Approaches:** (1) Reuse the authenticated Water repository and add a Home-owned detail panel/chart (selected; keeps API ownership and behavior intact). (2) Add a new Home endpoint or backend DTO (rejected; duplicates an existing authenticated daily contract). (3) Keep the mock chart and only replace the headline value (rejected; leaves the requested visualizations inaccurate).
- **Implementation choices:** Integrate Home with `useWaterDaily` and add an explicit reload path keyed by Home refresh/focus; update the Water card with returned data; add a focused chart component for chronological loggedAt/amountMl points with 500 ml ticks. No Backend source change is expected.
- **Acceptance:** Home shows the API total/goal and goal progress; each returned log appears in local-time order on a chart with 500 ml scale marks; empty/error/loading states do not show sample values; refresh reloads Water; EN/VI copy and screen reader labels are provided.
