# All Insights and Insight Detail · P2

Mobile reads `GET /api/sleep/insights` and `GET /api/sleep/insights/{code}` through the authenticated shared HTTP client. Neither request sends query parameters. The repository validates the period, supported A01/B01 codes, A/B category, status and locked state, then preserves sample, evidence, references and version values from the response.

All Insights groups entries by category A and B. READY entries can show their summary/highlight and open detail. `INSUFFICIENT_DATA`, `NO_DATA` and `UNVERIFIED_DATA` entries display only their title and status. Detail makes a fresh request by code; retry issues the same endpoint again so updated server evidence is shown without a client calculation or cached version constraint.

The HTTP adapter accepts only A01 and B01 for this delivery. The explicit development mock mode retains fixture-backed behavior through mock repository implementations of the same methods. Existing goal and AI repository behavior is unchanged.

Focused transport coverage lives in `tests/sleep-insights-http.test.cjs`.
