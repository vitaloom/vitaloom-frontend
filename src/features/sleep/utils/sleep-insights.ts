import type { Insight } from '../types/sleep';

export function distinctInsights(items: readonly Insight[]) {
  const eligible = items.filter((item) => item.eligible && item.status === 'ready');
  return eligible.filter((item) => {
    const equivalent = item.key.code === 'B02' ? 'C01' : item.key.code === 'B04' ? 'C04' : null;
    return !equivalent || !eligible.some((other) => other.key.code === equivalent && other.key.week === item.key.week);
  });
}
