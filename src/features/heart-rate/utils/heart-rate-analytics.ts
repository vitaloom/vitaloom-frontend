import type { HeartRateBucket, HeartRateSeries } from '../api/heart-rate-api';

export type HeartRateAnalyticsPeriod = 'day' | 'week' | 'custom';
export type HeartRateAnalyticsBucket = HeartRateBucket & {
  endAt: string;
  date: string;
};
export type HeartRateAnalytics = {
  buckets: HeartRateAnalyticsBucket[];
  sampleCount: number;
  nonemptyBucketCount: number;
  minBpm: number | null;
  avgBpm: number | null;
  maxBpm: number | null;
};

const timeZone = 'Asia/Ho_Chi_Minh';
const dateFormatter = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
const localDate = (instant: string) => {
  const parts = dateFormatter.formatToParts(new Date(instant));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};
const shiftDate = (date: string, offset: number) => {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
};

function aggregateGroup(buckets: HeartRateBucket[], date: string, endAt: string): HeartRateAnalyticsBucket {
  const populated = buckets.filter((bucket) => bucket.sampleCount > 0 && bucket.avgBpm != null);
  const sampleCount = populated.reduce((sum, bucket) => sum + bucket.sampleCount, 0);
  return {
    startAt: buckets[0]?.startAt ?? endAt,
    endAt,
    date,
    minBpm: populated.length ? Math.min(...populated.map((bucket) => bucket.minBpm ?? bucket.avgBpm!)) : null,
    avgBpm: sampleCount ? populated.reduce((sum, bucket) => sum + bucket.avgBpm! * bucket.sampleCount, 0) / sampleCount : null,
    maxBpm: populated.length ? Math.max(...populated.map((bucket) => bucket.maxBpm ?? bucket.avgBpm!)) : null,
    sampleCount,
  };
}

function aggregateDailySeries(series: HeartRateSeries): HeartRateAnalyticsBucket[] {
  const buckets: HeartRateAnalyticsBucket[] = [];
  const sourceBucketMs = series.intervalMinutes * 60_000;
  for (let index = 0; index < series.buckets.length; index += 4) {
    const group = series.buckets.slice(index, index + 4);
    if (!group.length) continue;
    const endAt = new Date(Date.parse(group[0].startAt) + sourceBucketMs * group.length).toISOString();
    buckets.push(aggregateGroup(group, localDate(group[0].startAt), endAt));
  }
  return buckets;
}

function aggregateByLocalDay(series: HeartRateSeries): HeartRateAnalyticsBucket[] {
  if (!series.buckets.length) return [];
  const startDate = localDate(series.startAt);
  const endDate = localDate(new Date(Date.parse(series.endAt) - 1).toISOString());
  const bucketsByDate = new Map<string, HeartRateBucket[]>();
  series.buckets.forEach((bucket) => {
    const date = localDate(bucket.startAt);
    const group = bucketsByDate.get(date);
    if (group) group.push(bucket);
    else bucketsByDate.set(date, [bucket]);
  });
  const groups: HeartRateAnalyticsBucket[] = [];
  for (let date = startDate; date <= endDate; date = shiftDate(date, 1)) {
    const group = bucketsByDate.get(date) ?? [];
    const endAt = group.length
      ? new Date(Date.parse(group[group.length - 1].startAt) + series.intervalMinutes * 60_000).toISOString()
      : new Date(Date.parse(series.startAt) + groups.length * 86_400_000).toISOString();
    groups.push(aggregateGroup(group, date, endAt));
  }
  return groups;
}

export function aggregateHeartRateSeries(series: HeartRateSeries, period: HeartRateAnalyticsPeriod): HeartRateAnalytics {
  const buckets = period === 'day' ? aggregateDailySeries(series) : aggregateByLocalDay(series);
  const populated = buckets.filter((bucket) => bucket.sampleCount > 0 && bucket.avgBpm != null);
  const sampleCount = populated.reduce((sum, bucket) => sum + bucket.sampleCount, 0);
  return {
    buckets,
    sampleCount,
    nonemptyBucketCount: populated.length,
    minBpm: populated.length ? Math.min(...populated.map((bucket) => bucket.minBpm ?? bucket.avgBpm!)) : null,
    avgBpm: sampleCount ? populated.reduce((sum, bucket) => sum + bucket.avgBpm! * bucket.sampleCount, 0) / sampleCount : null,
    maxBpm: populated.length ? Math.max(...populated.map((bucket) => bucket.maxBpm ?? bucket.avgBpm!)) : null,
  };
}

export function connectedHeartRateSegments(buckets: HeartRateAnalyticsBucket[]): HeartRateAnalyticsBucket[][] {
  const segments: HeartRateAnalyticsBucket[][] = [];
  let current: HeartRateAnalyticsBucket[] = [];
  buckets.forEach((bucket) => {
    if (bucket.sampleCount === 0 || bucket.avgBpm == null) {
      if (current.length) segments.push(current);
      current = [];
    } else current.push(bucket);
  });
  if (current.length) segments.push(current);
  return segments;
}
