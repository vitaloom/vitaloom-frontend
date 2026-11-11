import { getMonday, shiftCalendarDate } from '../../heart-rate/utils/heart-rate-date';
import type { StatisticsMode, StatisticsPeriod } from '../types/statistics';

export const statisticsTimeZone = 'Asia/Ho_Chi_Minh';

export function makePeriod(mode: StatisticsMode, date: string, today: string): StatisticsPeriod {
  const start = mode === 'week' ? getMonday(date) : date;
  return { mode, start, end: mode === 'week' ? shiftCalendarDate(start, 6) : start, today, timeZone: statisticsTimeZone };
}

export function movePeriod(period: StatisticsPeriod, direction: -1 | 1) {
  const candidate = shiftCalendarDate(period.start, direction * (period.mode === 'week' ? 7 : 1));
  return candidate <= period.today ? candidate : period.start;
}
