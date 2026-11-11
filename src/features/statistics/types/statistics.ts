import type { Feeling } from '@/features/sleep/types/sleep';

export type StatisticsMode = 'day' | 'week';
export type StatisticsPeriod = {
  mode: StatisticsMode;
  start: string;
  end: string;
  today: string;
  timeZone: 'Asia/Ho_Chi_Minh';
};

export type MetricSnapshot = {
  value: number | null;
  trend: readonly (number | null)[];
  partial: boolean;
  feeling?: Feeling | null;
};

export type MetricSource = (period: StatisticsPeriod, signal: AbortSignal) => Promise<MetricSnapshot>;
export type MetricState =
  | { status: 'loading' | 'empty' | 'unavailable' | 'error' }
  | { status: 'ready' | 'partial'; data: MetricSnapshot };
