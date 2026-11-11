import type { HeartRateBucket } from '@/features/heart-rate/api/heart-rate-api';
import type { WeeklyWaterPoint } from '@/features/water/types/water';
import type { MetricSnapshot } from '../types/statistics';

export function meanHeartRate(buckets: readonly Pick<HeartRateBucket, 'avgBpm' | 'sampleCount'>[]) {
  let samples = 0;
  let sum = 0;
  for (const { avgBpm, sampleCount } of buckets) {
    if (avgBpm == null || sampleCount <= 0) continue;
    samples += sampleCount;
    sum += avgBpm * sampleCount;
  }
  return samples ? sum / samples : null;
}

export function weeklyWater(days: readonly Pick<WeeklyWaterPoint, 'date' | 'totalMl'>[], today: string): MetricSnapshot {
  const trend = days.map(({ date, totalMl }) => date <= today && totalMl > 0 ? totalMl : null);
  const observed = trend.filter((value) => value != null);
  return {
    value: observed.length ? observed.reduce((total, value) => total + value, 0) / observed.length : null,
    trend,
    partial: days.some(({ date }) => date >= today),
  };
}
