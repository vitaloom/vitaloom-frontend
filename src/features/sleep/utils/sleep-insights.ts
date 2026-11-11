import type { Insight, InsightCategory, InsightList } from '../types/sleep';

export type InsightFallback =
  | { kind: 'none' }
  | { kind: 'no-data' }
  | { kind: 'insufficient'; requirements: { title: string; detail: string }[] }
  | { kind: 'unavailable' };

/** Resolves only states supported by a successfully loaded, verified insight list. */
export function insightFallback(list: InsightList, category: InsightCategory | 'all'): InsightFallback {
  if (list.status === 'no-data') return { kind: 'no-data' };
  if (list.status !== 'ready') return { kind: 'unavailable' };

  const candidates = list.items.filter((item) => category === 'all' || item.category === category);
  if (candidates.some((item) => item.eligible && item.status === 'ready')) return { kind: 'none' };

  const requirements = candidates
    .filter((item) => item.status === 'insufficient' && item.summary.trim().length > 0)
    .map((item) => ({ title: item.title, detail: item.summary.trim() }));

  return requirements.length > 0 ? { kind: 'insufficient', requirements } : { kind: 'unavailable' };
}

export function distinctInsights(items: readonly Insight[]) {
  const eligible = items.filter((item) => item.eligible && item.status === 'ready');
  return eligible.filter((item) => {
    const equivalent = item.key.code === 'B02' ? 'C01' : item.key.code === 'B04' ? 'C04' : null;
    return !equivalent || !eligible.some((other) => other.key.code === equivalent && other.key.week === item.key.week);
  });
}
