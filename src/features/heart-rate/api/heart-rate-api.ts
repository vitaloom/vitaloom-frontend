import { apiRequest } from '@/lib/api/http-client';
import { heartRateSeriesPath, heartRateSummaryPath } from '../utils/heart-rate-date';

export type HeartRateSummary = {
  date: string;
  timezone: 'Asia/Ho_Chi_Minh';
  asOf: string;
  latestRecorded: null | { heartRateBpm: number; occurredAt: string };
  dailyAverage: { heartRateBpm: number | null; dataStatus: 'CURRENT_DAY_PARTIAL' | 'HISTORY_UNVERIFIED' | 'HISTORY_VERIFIED' };
};

export type HeartRateBucket = {
  startAt: string;
  minBpm: number | null;
  avgBpm: number | null;
  maxBpm: number | null;
  sampleCount: number;
};

export type HeartRateSeries = {
  startAt: string;
  endAt: string;
  timezone: 'Asia/Ho_Chi_Minh';
  intervalMinutes: number;
  buckets: HeartRateBucket[];
};

export const heartRateApi = {
  summary: (date: string, signal?: AbortSignal) => apiRequest<HeartRateSummary>(heartRateSummaryPath(date), { method: 'GET', signal }, true),
  series: (mode: 'day' | 'week' | 'custom', values: { date?: string; weekStartDate?: string; startDate?: string; endDate?: string }, signal?: AbortSignal) => apiRequest<HeartRateSeries>(heartRateSeriesPath(mode, values), { method: 'GET', signal }, true),
};
