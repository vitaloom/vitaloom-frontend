# Backend integration handoff

Heart Rate, Steps and Water are connected through the existing mobile services. The [API contract](api-contract.md) documents their mapping and [statistics-sources.ts](../../../src/features/statistics/services/statistics-sources.ts) owns the adapters.

## Sleep integration

1. Confirm authenticated, per-account access and isolation for daily and weekly Sleep reads before binding account health data. The [backend API index](https://github.com/vitaloom/vitaloom-backend/blob/main/docs/api/api-contract.md) records the current gap.
2. Agree on the local reporting day and week boundaries with the Sleep journal owner. Sleep business rules assign sessions by wake/end day, including duration-only records. Clarify how stored session timezones map into the overview timezone.
3. Supply the selected day's recorded duration in minutes and an optional recorded feeling. If a day has multiple sessions, specify which recorded feeling represents the day. The frontend accepts `comfortable`, `normal`, `tired`, or null. Missing or unsupported feelings should map to null.
4. Supply the weekly mean nightly duration and the daily duration trend, preserving Monday–Sunday positions, nulls, and partial-period status. Confirm the recorded-night denominator and treatment of naps with the Sleep reporting owner.
5. Bind the source in `statisticsSources.sleep` and verify successful, empty, sparse and failed reads across account and period switches. Use the same authenticated HTTP client as the other metrics.

A canonical weekly Heart Rate mean and server-supplied coverage metadata would let the screen distinguish incomplete historical data more precisely. Water currently uses its documented recorded-day average from weekly progress and needs no new endpoint for this overview.
