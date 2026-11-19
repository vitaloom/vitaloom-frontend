# P5B completed trend integration

Mobile's All Insights screen requests `GET /api/sleep/insights?catalog=trend`. If an older Backend responds with `400 INVALID_REQUEST`, it retries the established `catalog=goal` endpoint. Other errors remain visible to the user. Default Recent highlights and consent-gated Story continue to support their existing codes.

A03 and B03 open the existing `/sleep/insights/[code]` route. Detail renders only READY evidence whose two seven-day periods are adjacent, use `Asia/Ho_Chi_Minh`, and match the Detail period. A03 compares the signed difference of the server-provided mean-minute values. B03 uses rated-only counts and denominators and validates each server-provided percentage-point change against the underlying counts. The HTTP adapter rejects missing or malformed READY evidence. Non-READY status keeps the established locked-detail state.

The A03 presentation uses a compact signed-delta card and same-scale bars for each period. B03 shows the Comfortable share change and two 100% stacks, with all three feeling shares and changes labelled in English and Vietnamese. Period labels and samples stay with the bars. The accessible chart summaries describe the series and values in text. The API carries source references, while the current HTTP Journal supports date filters only.

References: [P5B design matrix](../../../../vitaloom-business-docs-and-tools/docs/technical/sleep-recent-handoff/06-ow-traceability.md#design-to-implementation-traceability--2026-11-15), [A03 visual](../../../../design/sleep-tracking/15-insight-a03-duration-trend.png), [B03 visual](../../../../design/sleep-tracking/20-insight-b03-feeling-trend.png).

## Verification

Implementation checks and Android evidence are recorded in the shared [P5B task handoff](../../../../vitaloom-business-docs-and-tools/docs/development-workflow/tasks/sleep-p5b-a03-b03.md).
