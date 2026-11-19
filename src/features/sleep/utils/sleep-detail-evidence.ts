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
    }[] }
  | { code: 'A05'; weekday: { days: number; meanMinutes: number }; weekend: { days: number; meanMinutes: number }; deltaMinutes: number }
  | { code: 'B02'; comfortable: { days: number; meanMinutes: number }; tired: { days: number; meanMinutes: number }; deltaMinutes: number }
  | { code: 'A04'; timeZone: string; eligibleRangeDays: number; bedtime: { minMinute: number; maxMinute: number; spanMinutes: number };
      wake: { minMinute: number; maxMinute: number; spanMinutes: number } }
  | { code: 'A03'; baseline: { period: SleepInsightPeriod; meanMinutes: number; mainDays: number };
      recent: { period: SleepInsightPeriod; meanMinutes: number; mainDays: number }; deltaMinutes: number }
  | { code: 'B03'; baseline: { period: SleepInsightPeriod; ratedMain: number; mainWithoutFeeling: number;
      categories: { key: 'comfortable' | 'normal' | 'tired'; count: number; denominator: number; percentage: number }[] };
      recent: { period: SleepInsightPeriod; ratedMain: number; mainWithoutFeeling: number;
      categories: { key: 'comfortable' | 'normal' | 'tired'; count: number; denominator: number; percentage: number }[] };
      deltaPercentagePoints: Record<'comfortable' | 'normal' | 'tired', number> };

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

  if (code === 'A05' || code === 'B02') {
    const firstKey = code === 'A05' ? 'weekday' : 'comfortable';
    const secondKey = code === 'A05' ? 'weekend' : 'tired';
    const firstMin = code === 'A05' ? 3 : 3;
    const secondMin = code === 'A05' ? 2 : 3;
    const first = evidence[firstKey];
    const second = evidence[secondKey];
    if (!isRecord(first) || !isRecord(second) || !isCount(first.days) || first.days < firstMin || first.days > 5
      || !isCount(second.days) || second.days < secondMin || second.days > (code === 'A05' ? 2 : 7)
      || !isCount(first.meanMinutes) || first.meanMinutes < 1 || first.meanMinutes > 1440
      || !isCount(second.meanMinutes) || second.meanMinutes < 1 || second.meanMinutes > 1440
      || !Number.isSafeInteger(evidence.deltaMinutes)
      || evidence.deltaMinutes !== Number(first.meanMinutes) - Number(second.meanMinutes)) return null;
    return code === 'A05'
      ? { code, weekday: { days: first.days, meanMinutes: first.meanMinutes }, weekend: { days: second.days, meanMinutes: second.meanMinutes }, deltaMinutes: evidence.deltaMinutes as number }
      : { code, comfortable: { days: first.days, meanMinutes: first.meanMinutes }, tired: { days: second.days, meanMinutes: second.meanMinutes }, deltaMinutes: evidence.deltaMinutes as number };
  }

  if (code === 'A04') {
    const range = (entry: unknown) => {
      if (!isRecord(entry) || !Number.isSafeInteger(entry.minMinute) || !Number.isSafeInteger(entry.maxMinute)
        || !Number.isSafeInteger(entry.spanMinutes) || Number(entry.maxMinute) < Number(entry.minMinute)
        || Number(entry.spanMinutes) !== Number(entry.maxMinute) - Number(entry.minMinute)
        || Number(entry.minMinute) < -1440 || Number(entry.maxMinute) > 2879) return null;
      return { minMinute: Number(entry.minMinute), maxMinute: Number(entry.maxMinute), spanMinutes: Number(entry.spanMinutes) };
    };
    const bedtime = range(evidence.bedtime);
    const wake = range(evidence.wake);
    if (typeof evidence.timeZone !== 'string' || !evidence.timeZone || !isCount(sample.eligibleRangeDays)
      || sample.eligibleRangeDays < 3 || sample.eligibleRangeDays > 7 || !bedtime || !wake) return null;
    return { code, timeZone: evidence.timeZone, eligibleRangeDays: sample.eligibleRangeDays, bedtime, wake };
  }

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
  if (code === 'A03' || code === 'B03') {
    const baseline = evidence.baseline;
    const recent = evidence.recent;
    if (!isRecord(baseline) || !isRecord(recent) || !validPeriod(baseline.period) || !validPeriod(recent.period)
      || recent.period.start !== value.period.start || recent.period.end !== value.period.end
      || recent.period.timeZone !== value.period.timeZone || baseline.period.timeZone !== value.period.timeZone
      || recent.period.timeZone !== 'Asia/Ho_Chi_Minh'
      || shiftDay(baseline.period.end, 1) !== recent.period.start
      || shiftDay(baseline.period.start, 6) !== baseline.period.end
      || shiftDay(recent.period.start, 6) !== recent.period.end) return null;

    if (code === 'A03') {
      const baselineDays = sample.baselineMainDays;
      const recentDays = sample.recentMainDays;
      if (!isCount(baselineDays) || baselineDays < 3 || baselineDays > 7
        || !isCount(recentDays) || recentDays < 3 || recentDays > 7
        || !isCount(baseline.meanMinutes) || baseline.meanMinutes < 1 || baseline.meanMinutes > 1440
        || !isCount(recent.meanMinutes) || recent.meanMinutes < 1 || recent.meanMinutes > 1440
        || !Number.isSafeInteger(evidence.deltaMinutes)
        || evidence.deltaMinutes !== Number(recent.meanMinutes) - Number(baseline.meanMinutes)) return null;
      return { code, baseline: { period: baseline.period, meanMinutes: baseline.meanMinutes, mainDays: baselineDays },
        recent: { period: recent.period, meanMinutes: recent.meanMinutes, mainDays: recentDays },
        deltaMinutes: evidence.deltaMinutes as number };
    }

    const baselineRated = sample.baselineRatedMain;
    const recentRated = sample.recentRatedMain;
    const baselineMissing = sample.baselineMainWithoutFeeling;
    const recentMissing = sample.recentMainWithoutFeeling;
    if (!isCount(baselineRated) || baselineRated < 3 || baselineRated > 7
      || !isCount(recentRated) || recentRated < 3 || recentRated > 7
      || !isCount(baselineMissing) || baselineRated + baselineMissing > 7
      || !isCount(recentMissing) || recentRated + recentMissing > 7
      || !isRecord(evidence.deltaPercentagePoints)) return null;
    const keys = ['comfortable', 'normal', 'tired'] as const;
    const readCategories = (source: RecordValue, denominator: number) => {
      const categories = [];
      let total = 0;
      for (const key of keys) {
        const row = source[key];
        if (!isRecord(row) || !isCount(row.count) || row.denominator !== denominator
          || typeof row.percentage !== 'number' || !Number.isFinite(row.percentage)
          || row.percentage !== Math.round(row.count * 10000 / denominator) / 100) return null;
        total += row.count;
        categories.push({ key, count: row.count, denominator, percentage: row.percentage });
      }
      return total === denominator ? categories : null;
    };
    const baselineCategories = readCategories(baseline, baselineRated);
    const recentCategories = readCategories(recent, recentRated);
    if (!baselineCategories || !recentCategories) return null;
    const deltas = {} as Record<typeof keys[number], number>;
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const delta = evidence.deltaPercentagePoints[key];
      const expected = Math.round((recentCategories[index].count / recentRated
        - baselineCategories[index].count / baselineRated) * 10000) / 100;
      if (typeof delta !== 'number' || !Number.isFinite(delta) || delta !== expected) return null;
      deltas[key] = delta;
    }
    return {
      code,
      baseline: { period: baseline.period, ratedMain: baselineRated, mainWithoutFeeling: baselineMissing,
        categories: baselineCategories },
      recent: { period: recent.period, ratedMain: recentRated, mainWithoutFeeling: recentMissing,
        categories: recentCategories },
      deltaPercentagePoints: deltas,
    };
  }
  return null;
}
