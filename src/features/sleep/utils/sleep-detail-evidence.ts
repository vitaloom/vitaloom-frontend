import type { CatalogSleepInsightCode, SleepInsightPeriod } from '../types/sleep';
import { shiftDay } from './sleep-date';

const coverageStatuses = ['RECORDED', 'NOT_RECORDED'] as const;
const goalStatuses = ['MET', 'MISSED', 'NO_MAIN', 'NO_GOAL'] as const;
type CalendarDay<T extends string> = { day: string; status: T };
export type SleepCalendarDay = CalendarDay<typeof coverageStatuses[number] | typeof goalStatuses[number]>;

export type SleepDetailVisual =
  | { code: 'A01'; recordedMainDays: number; denominator: 7; days?: CalendarDay<typeof coverageStatuses[number]>[] }
  | { code: 'A02'; metGoalDays: number; eligibleMainDays: number; days?: CalendarDay<typeof goalStatuses[number]>[] }
  | { code: 'B01'; ratedMain: number; mainWithoutFeeling: number; categories: {
      key: 'comfortable' | 'normal' | 'tired'; count: number; denominator: number; percentage: number;
    }[] }
  | { code: 'B04'; ratedMain: number; comparableRatedMain: number; exceptions: {
      day: string; minutes: number; goalMinutes: number;
    }[] };

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const isCount = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;

function isCivilDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validPeriod(value: unknown): value is SleepInsightPeriod {
  if (!isRecord(value)) return false;
  return isCivilDay(value.start) && isCivilDay(value.end) && value.start <= value.end
    && typeof value.timeZone === 'string' && value.timeZone.length > 0;
}

function calendarDays<T extends string>(
  value: unknown, period: SleepInsightPeriod, statuses: readonly T[],
): CalendarDay<T>[] | undefined {
  if (!Array.isArray(value) || value.length !== 7 || period.timeZone !== 'Asia/Ho_Chi_Minh'
    || shiftDay(period.start, 6) !== period.end) return undefined;
  const days: CalendarDay<T>[] = [];
  for (const [index, row] of value.entries()) {
    const day = shiftDay(period.start, index);
    if (!isRecord(row) || row.day !== day) return undefined;
    const status = statuses.find((allowed) => allowed === row.status);
    if (!status) return undefined;
    days.push({ day, status });
  }
  return days;
}

export function readSleepDetailVisual(value: unknown): SleepDetailVisual | null {
  if (!isRecord(value) || value.status !== 'READY' || !validPeriod(value.period)
    || !isRecord(value.sample) || !isRecord(value.evidence)) return null;
  const code = value.code as CatalogSleepInsightCode;
  const sample = value.sample;
  const evidence = value.evidence;

  if (code === 'A01') {
    const recorded = sample.recordedMainDays;
    const denominator = sample.coverageDenominator;
    if (!isCount(recorded) || recorded < 3 || recorded > 7 || denominator !== 7
      || evidence.recordedMainDays !== recorded || evidence.coverageDenominator !== denominator) return null;
    const days = calendarDays(evidence.days, value.period, coverageStatuses);
    return { code, recordedMainDays: recorded, denominator: 7,
      ...(days?.filter(({ status }) => status === 'RECORDED').length === recorded ? { days } : {}) };
  }

  if (code === 'A02') {
    const eligible = sample.eligibleMainDays;
    const met = evidence.metGoalDays;
    if (!isCount(eligible) || eligible < 3 || eligible > 7 || !isCount(met) || met > eligible
      || evidence.eligibleMainDays !== eligible) return null;
    const days = calendarDays(evidence.days, value.period, goalStatuses);
    const validDays = days?.filter(({ status }) => status === 'MET').length === met
      && days?.filter(({ status }) => status === 'MET' || status === 'MISSED').length === eligible;
    return { code, metGoalDays: met, eligibleMainDays: eligible, ...(validDays ? { days } : {}) };
  }

  if (code === 'B01') {
    const rated = sample.ratedMain;
    const missing = sample.mainWithoutFeeling;
    if (!isCount(rated) || rated < 3 || rated > 7 || !isCount(missing) || rated + missing > 7
      || evidence.mainWithoutFeeling !== missing) return null;
    const keys = ['comfortable', 'normal', 'tired'] as const;
    const categories = [];
    let total = 0;
    for (const key of keys) {
      const category = evidence[key];
      if (!isRecord(category) || !isCount(category.count) || category.denominator !== rated
        || typeof category.percentage !== 'number' || !Number.isFinite(category.percentage)
        || category.percentage !== Math.round(category.count * 10000 / rated) / 100) return null;
      total += category.count;
      categories.push({ key, count: category.count, denominator: rated, percentage: category.percentage });
    }
    if (total !== rated) return null;
    return { code, ratedMain: rated, mainWithoutFeeling: missing, categories };
  }

  if (code === 'B04') {
    const rated = sample.ratedMain;
    const comparable = sample.comparableRatedMain;
    const exceptionCount = evidence.exceptionCount;
    const exceptions = evidence.exceptions;
    if (!isCount(rated) || rated < 3 || rated > 7 || !isCount(comparable) || comparable > rated
      || !isCount(exceptionCount) || exceptionCount < 1 || exceptionCount > comparable
      || evidence.ratedMain !== rated || !Array.isArray(exceptions) || exceptions.length !== exceptionCount) return null;
    const seen = new Set<string>();
    const parsed = [];
    for (const item of exceptions) {
      if (!isRecord(item) || !isCivilDay(item.day) || item.day < value.period.start || item.day > value.period.end
        || seen.has(item.day) || !Number.isInteger(item.minutes) || Number(item.minutes) < 1 || Number(item.minutes) > 1440
        || !Number.isInteger(item.goalMinutes) || Number(item.goalMinutes) < 60 || Number(item.goalMinutes) > 1440
        || Number(item.goalMinutes) % 15 !== 0 || Number(item.minutes) < Number(item.goalMinutes)) return null;
      seen.add(item.day);
      parsed.push({ day: item.day, minutes: Number(item.minutes), goalMinutes: Number(item.goalMinutes) });
    }
    return { code, ratedMain: rated, comparableRatedMain: comparable, exceptions: parsed };
  }
  return null;
}
