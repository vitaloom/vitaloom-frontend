import { apiRequest } from '@/lib/api/http-client';
import { stepsSeriesPath } from '../utils/steps-date';

export type StepsBucket = {
  startAt: string;
  endAt: string;
  steps: number | null;
  eventCount: number;
};

export type StepsGoal = {
  targetSteps: number;
  effectiveDate: string;
};

export type StepsSeries = {
  startAt: string;
  endAt: string;
  timezone: 'Asia/Ho_Chi_Minh';
  bucketSizeMinutes: number;
  totalSteps: number | null;
  buckets: StepsBucket[];
  goal?: StepsGoal | null;
  progressPercent?: number | null;
};

export const stepsApi = {
  series: (
    mode: 'day' | 'week' | 'custom',
    values: { date?: string; weekStartDate?: string; startDate?: string; endDate?: string },
    signal?: AbortSignal,
  ) => apiRequest<StepsSeries>(stepsSeriesPath(mode, values), { method: 'GET', signal }, true),
  setGoal: (targetSteps: number, signal?: AbortSignal) => apiRequest<StepsGoal>('/steps/goal', {
    method: 'PUT', body: JSON.stringify({ targetSteps }), signal,
  }, true),
  removeGoal: (signal?: AbortSignal) => apiRequest<void>('/steps/goal', { method: 'DELETE', signal }, true),
};
