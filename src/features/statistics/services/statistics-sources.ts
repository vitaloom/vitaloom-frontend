import { heartRateApi } from '@/features/heart-rate/api/heart-rate-api';
import { isStatisticsRateLimit } from '@/lib/api/http-client';
import { dateInHcm } from '@/features/heart-rate/utils/heart-rate-date';
import { stepsApi } from '@/features/steps/api/steps-api';
import { ApiWaterRepository } from '@/features/water/services/api-water.repository';
import { meanHeartRate, weeklyWater } from '../data/statistics-data';
import { statisticsTimeZone } from '../data/statistics-period';
import type { MetricSource, StatisticsPeriod } from '../types/statistics';

const water = new ApiWaterRepository(undefined, () => statisticsTimeZone);
const params = ({ mode, start }: StatisticsPeriod) => mode === 'day' ? { date: start } : { weekStartDate: start };

const heartRate: MetricSource = async (period, signal) => {
  const day = period.mode === 'day';
  const [series, summary] = await Promise.allSettled([
    heartRateApi.series(period.mode, params(period), signal),
    day ? heartRateApi.summary(period.start, signal) : Promise.resolve(null),
  ]);
  if (series.status === 'rejected' && isStatisticsRateLimit(series.reason)) throw series.reason;
  if (summary.status === 'rejected' && isStatisticsRateLimit(summary.reason)) throw summary.reason;
  if (series.status === 'rejected' && (summary.status === 'rejected' || !day)) throw series.reason;

  const now = Date.now();
  const buckets = series.status === 'fulfilled' ? series.value.buckets : [];
  const observed = buckets.filter(({ startAt }) => Date.parse(startAt) <= now);
  const value = summary.status === 'fulfilled' && summary.value
    ? summary.value.dailyAverage.heartRateBpm
    : meanHeartRate(observed);
  return {
    value,
    trend: buckets.map(({ startAt, avgBpm, sampleCount }) => Date.parse(startAt) <= now && sampleCount > 0 ? avgBpm : null),
    partial: period.end >= period.today || series.status === 'rejected' || summary.status === 'rejected',
  };
};

const steps: MetricSource = async (period, signal) => {
  const { totalSteps, buckets } = await stepsApi.series(period.mode, params(period), signal);
  const now = Date.now();
  return {
    value: totalSteps,
    trend: buckets.map(({ startAt, steps }) => Date.parse(startAt) <= now ? steps : null),
    partial: period.end >= period.today,
  };
};

const waterIntake: MetricSource = async (period) => {
  if (period.mode === 'week') {
    const { days } = await water.getWeeklySummary(period.start);
    return weeklyWater(days, period.today);
  }
  const { totalMl, logs } = await water.getDailySummary(period.start);
  const start = Date.parse(`${period.start}T00:00:00+07:00`);
  const trend: (number | null)[] = Array(8).fill(null);
  const now = Date.now();
  for (const { loggedAt, amountMl } of logs) {
    const time = Date.parse(loggedAt);
    if (!Number.isFinite(time) || time > now || dateInHcm(new Date(time)) !== period.start) continue;
    const index = Math.floor((time - start) / (3 * 60 * 60 * 1000));
    trend[index] = (trend[index] ?? 0) + amountMl;
  }
  return { value: logs.length ? totalMl : null, trend, partial: period.end >= period.today };
};

export const statisticsSources = { heartRate, steps, water: waterIntake, sleep: undefined } satisfies Record<string, MetricSource | undefined>;
