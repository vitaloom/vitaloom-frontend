# Statistics API contract

The overview uses the existing authenticated mobile API clients. The [backend API index](https://github.com/vitaloom/vitaloom-backend/blob/main/docs/api/api-contract.md) links the wire contracts. Statistics introduces no network routes.

## Frontend contract

[statistics.ts](../../../src/features/statistics/types/statistics.ts) defines the adapter boundary. A `MetricSource` accepts a `StatisticsPeriod` and an abort signal and resolves to a `MetricSnapshot`. The period contains the mode, inclusive local start/end dates, local today, and timezone. Day uses one date. Week starts Monday and ends Sunday. The current period is selectable. Its future buckets stay blank. API intervals use the corresponding exclusive end where defined by the metric contract.

Each snapshot carries a nullable numeric value, a chronological trend with nullable positions, and a partial flag. Sleep may also include a recorded feeling. The view state distinguishes loading, ready, partial, empty, unavailable, and error. An observation of zero is distinct from a missing observation. A missing source maps to unavailable. A rejected read maps to error with a metric-specific retry. If one Heart Rate day read fails, the available summary or trend remains visible and marked partial when it contains data.

| Metric | Existing compatibility and mapping | Remaining data |
| --- | --- | --- |
| Heart Rate | Authenticated summary and day/week series. Day uses accepted daily mean. Week uses a sample-weighted average of observed bucket means. Trend is the recorded average per response bucket. Unit is BPM. | A canonical weekly mean field would remove dependence on bucket rounding. |
| Steps | Authenticated day/week series supplies period total and hourly/daily trend. Unit is steps. | Coverage metadata would distinguish a complete historical period from a sparse series. |
| Water | Authenticated daily summary and weekly progress through the existing repository. Request the overview timezone explicitly. Day uses logged total and three-hour groups of log instants. Week uses the mean over recorded days, per Water BR-F2.9. Display liters from milliliters. | The weekly response uses zero placeholders for no logs. Positive totals identify recorded days under the current positive-amount contract. |
| Sleep | Existing mobile Sleep repository types describe daily and weekly reads. Its implementation uses local fixtures. The backend API index documents the isolation gap in its Sleep routes. | An authenticated account-scoped source must supply day duration and recorded feeling, plus weekly nightly mean and daily duration trend in minutes. |

Statistics uses `Asia/Ho_Chi_Minh` across all cards to align with Heart Rate and Steps. Water detail uses device timezone by default, so a different device timezone can yield different day totals between the overview and detail. A normalized Sleep response should explicitly define its reporting timezone and day attribution.

Related references are the [Heart Rate API](https://github.com/vitaloom/vitaloom-backend/blob/main/docs/api/metrics/heart-rate.md), [Steps API](https://github.com/vitaloom/vitaloom-backend/blob/main/docs/api/metrics/steps.md), [Water API](https://github.com/vitaloom/vitaloom-backend/blob/main/docs/features/water/api-contract.md), and [Sleep API](https://github.com/vitaloom/vitaloom-backend/blob/main/docs/api/metrics/sleep.md).
