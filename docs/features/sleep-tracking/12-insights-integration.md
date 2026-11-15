# All Insights and Insight Detail · P2

Mobile reads `GET /api/sleep/insights` and `GET /api/sleep/insights/{code}` through the authenticated shared HTTP client. Neither request sends query parameters. The repository validates the period, supported A01/B01 codes, A/B category, status and locked state, then preserves sample, evidence, references and version values from the response.

All Insights groups entries by category A and B. READY entries can show their summary/highlight and open detail. `INSUFFICIENT_DATA`, `NO_DATA` and `UNVERIFIED_DATA` entries display only their title and status. Detail makes a fresh request by code; retry issues the same endpoint again so updated server evidence is shown without a client calculation or cached version constraint.

The HTTP adapter accepts only A01 and B01 for this delivery. On READY Detail, the optional AI area fetches consent only on screen load and sends `POST /api/sleep/ai/explanations` only after the user taps `Giải thích bằng AI`; the request contains the selected code and current evidence version hint. The response renders the three structured Vietnamese fields inline. Consent OFF, stale evidence and non-READY status keep deterministic evidence visible and clear any previous explanation. The explicit development mock mode retains fixture-backed behavior through mock repository implementations of the same methods.

Recent Report also consumes the additive optional `highlights` array (`code`, `status`, `title`, `summary`). It accepts READY A01/B01 entries, preserves server order, and renders at most three. A01 continues to use localized coverage copy; B01 opens the existing insight detail route. The legacy `insights` validation remains required and unchanged. When `highlights` is absent, Recent renders the legacy A01; when present, even as an empty array, it is authoritative. A localized View All action opens `/sleep/insights` from Recent, including NO_DATA and UNVERIFIED_DATA states, where the destination presents the server's locked/no-data entries.

Focused transport coverage lives in `tests/sleep-insights-http.test.cjs`.
