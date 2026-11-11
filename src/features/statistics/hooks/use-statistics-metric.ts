import { useEffect, useState } from 'react';
import type { MetricSource, MetricState, StatisticsPeriod } from '../types/statistics';

type Query = { period: StatisticsPeriod; accountId: string; refresh: number; retry: number };

export function useStatisticsMetric(source: MetricSource | undefined, period: StatisticsPeriod, accountId: string | undefined, refresh: number) {
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ query: Query; state: MetricState } | null>(null);

  useEffect(() => {
    if (!source || !accountId) return;
    const query = { period, accountId, refresh, retry };
    const controller = new AbortController();
    source(period, controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return;
        const hasData = data.value != null || !!data.feeling || data.trend.some((value) => value != null);
        const state: MetricState = hasData ? { status: data.partial ? 'partial' : 'ready', data } : { status: 'empty' };
        setResult({ query, state });
      },
      () => { if (!controller.signal.aborted) setResult({ query, state: { status: 'error' } }); },
    );
    return () => controller.abort();
  }, [source, accountId, period, refresh, retry]);

  let state: MetricState = { status: 'unavailable' };
  if (source && accountId) {
    const sameScope = result?.query.period === period && result.query.accountId === accountId;
    const pending = !sameScope || result.query.refresh !== refresh || result.query.retry !== retry;
    state = pending ? { status: 'loading' } : result.state;
    return { state, pending, retry: () => setRetry((value) => value + 1), previous: pending && sameScope ? result.state : null };
  }
  return { state, pending: false, retry: () => setRetry((value) => value + 1), previous: null };
}
