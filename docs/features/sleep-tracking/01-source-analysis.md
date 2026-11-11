# Source analysis

## Paths verified

The mobile checkout is D:/prj/vita-loom/vita-loom-mobile. Business documents are at D:/prj/vita-loom/vitaloom-business-docs-and-tools/docs/usecase_spec/sleep-tracking. Selected Sleep design files are at D:/prj/vita-loom/design/sleep-tracking, and standalone art is at D:/prj/vita-loom/design/assets/sleep-tracking. The target Personal Health Profile documentation is under vita-loom-mobile/docs/features/personal-health-profile. Source repositories are references only.

## Business sources

Read 00-module.md, F1 README.md, rules.md, SLT-UC-004 through 007, F2 README.md, rules.md, SLT-UC-008, SLT-UC-009, insight-catalog-v2.md, ai-content-guidelines.md, and ux-decision-traceability.md. Weekly workflow references are HIR f2-weekly-metric-reports/README.md, rules.md, and HIR-UC-002.

F1 session and Goal Use Cases are marked approved in their module sources, with module-level cross-validation and merge still pending. A/B/C extension thresholds and SLT-UC-009 are scoped, with catalog thresholds labeled proposed for review. C02 is deferred. HIR-UC-002 owns metric and week selection and report presentation. Sleep owns Sleep data, aggregate calculation, eligibility and evidence.

## Design and assets

Reviewed Sleep README.md, BEHAVIOR.md, SCREEN_STATES.md, FE_HANDOFF.md, ASSET_MAPPING.md, SCREEN_IMPORT.md, screen-manifest.json, artwork README and asset-manifest.json. Six selected single-screen designs cover Home, Record Time Range, Record Duration, Insights, Insight Detail and Weekly Report. Journal, Goal and alternate-state visuals have no approved baseline. Those are native extensions.

**Source conflict resolved:** design README and FE handoff retain a stale pending binary-import statement. The import record, manifests and local files report committed images and nine standalone art assets. Those sources support using the original PNGs. SVG fallbacks remain proposed. Screenshot dates, summaries, percentages, averages and AI prose are examples, not business data. Only approved individual art assets enter app components.

## Existing app patterns

The existing Expo Router entry /sleep is in the authenticated Stack and points to a placeholder screen that already includes the shared Health Metrics Sidebar. Routes use thin wrappers. Feature code belongs under src/features, shared appearance and spacing use src/theme, and Node tests load TypeScript with transpilation. Expo SDK 58, React Native 0.88, Router 58 and react-native-svg are already installed.

Statistics currently shows Heart Rate and Steps. It has no Sleep or HIR report workflow to reuse. Weekly Sleep presentation can be reached from Sleep while shared HIR selection remains a handoff decision.

The Personal Health Profile docs provide the requested numbered document convention and a process-memory typed mock pattern with revisions, explicit outcomes and unknown-write reconciliation. Water offers additional repository conventions. The backend Sleep contract currently documents PUT /api/sleep/daily, one current-day total in Asia/Ho_Chi_Minh. It does not authorize the session-journal design and lacks equivalent per-account isolation for production health data.

## Rule mapping

| Requirement | Canonical source | Frontend interpretation |
| --- | --- | --- |
| Session type and methods | BR-F1.1–3, SLT-UC-004 | Main/nap and one shared time-range/duration-only draft. Duration-only stores selected end day and minutes only. |
| Duration | BR-F1.4 | Integer minutes from 1 through 1440 inclusive. Preserve arbitrary-minute edits exactly. |
| Overlap and time | BR-F1.5–9, SLT-UC-004/006 | Half-open ranges may touch but not overlap. Resolve actual elapsed instants in one reference zone. Require explicit disambiguation for DST folds and gaps. |
| Statistical day/history | BR-F1.10–11 | Range is assigned to its wake-up day in the saved reference zone. Duration-only uses selected end day. Preserve saved context and historical range timezone. |
| Confirmation and conflict | BR-F1.12–16, SLT-UC-004/006/007 | Only acknowledged writes alter the visible confirmed result. A conflict reloads. Unknown remains unknown pending receipt check. Delete requires confirmation. |
| Optional feeling | BR-F1.17–18, F2 BR-F2.24 | One user-selected feeling per session, or no value. Never infer a feeling. |
| Goal | BR-F2.5–9, SLT-UC-008 | Explicit user confirmation; hours 1–24, minutes 00/15/30/45 and a 24:00 maximum. Historical effective values stay intact. |
| Progress and absent days | BR-F2.1–3, 18–19 | Show only verified aggregate and effective verified Goal. No record or missing verification is not zero. |
| Insights | BR-F2.10–37, SLT-UC-009 and catalog | Data status, sample, period, evidence, version and limits travel together. C01/C03/C04 require eligible parents. Disable C02. No unsupported insight. |
| AI | BR-F2.33–37 and AI guidelines | Deterministic evidence is available first. Consent is explicit. Mock content is identified as deterministic test fixtures. No LLM call. |
| Weekly report | HIR BR-F2.1–8, HIR-UC-002, Sleep BR-F2.3/18/33 | Monday–Sunday, no future week. Metric owner supplies verified data. HIR owns global selection/presentation. AI Story requires a completed verified week, eligible advanced insight and consent. |

## Open integration decisions

Backend review is needed for a session resource, authenticated account isolation, revision model, DST wire format, outcome receipts and replay retention, verification status, Goal effective-day semantics, evidence version coherence, AI disclosure and consent lifecycle, and HIR route integration. UX review is needed for Journal/Goal states, reference timezone placement, exact-minute entry, draft retention when switching methods and AI disclosure placement. Device QA must confirm safe areas, screen readers, keyboard overlap and visual fidelity.
