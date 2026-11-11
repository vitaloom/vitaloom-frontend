import type { Insight } from '../types/sleep';

export function insightHref(insight: Insight) {
  const { code, week, version, timeZone, sleepType } = insight.key;
  return {
    pathname: '/sleep/insights/[code]' as const,
    params: { code, week, version, ...(timeZone ? { timeZone } : {}), ...(sleepType ? { sleepType } : {}) },
  };
}
