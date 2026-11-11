const TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function dateInHcm(instant = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant);
  const part = (type: string) => parts.find((value) => value.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function shiftCalendarDate(date: string, offset: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

export function weekDates(date: string, weekOffset = 0) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const mondayOffset = (weekday + 6) % 7;
  const monday = shiftCalendarDate(date, weekOffset * 7 - mondayOffset);
  return Array.from({ length: 7 }, (_, index) => shiftCalendarDate(monday, index));
}

export function weekRangeLabel(dates: string[]) {
  if (dates.length < 7) return '';
  const start = new Date(`${dates[0]}T12:00:00Z`);
  const end = new Date(`${dates[6]}T12:00:00Z`);
  const dayMonth = (value: Date) => `${String(value.getUTCDate()).padStart(2, '0')}/${String(value.getUTCMonth() + 1).padStart(2, '0')}`;
  return `${dayMonth(start)}–${dayMonth(end)}/${end.getUTCFullYear()}`;
}

export function isFutureHcmDate(candidate: string, today: string) {
  return candidate > today;
}

export function heartRateSummaryPath(date: string) {
  return `/statistics/heart-rate/summary?date=${encodeURIComponent(date)}`;
}

export function heartRateSeriesPath(mode: 'day' | 'week' | 'custom', values: { date?: string; weekStartDate?: string; startDate?: string; endDate?: string }) {
  if (mode === 'day') return `/statistics/heart-rate/daily?date=${encodeURIComponent(values.date ?? dateInHcm())}`;
  if (mode === 'week') return `/statistics/heart-rate/weekly?weekStartDate=${encodeURIComponent(values.weekStartDate ?? dateInHcm())}`;
  return `/statistics/heart-rate/custom?startDate=${encodeURIComponent(values.startDate ?? '')}&endDate=${encodeURIComponent(values.endDate ?? '')}`;
}

export function getMonday(date: string) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return shiftCalendarDate(date, -((weekday + 6) % 7));
}

export type HeartRateRangeError = 'invalidDates' | 'orderDates' | 'futureEnd' | 'maxRange';

export function validateHeartRateRange(startDate: string, endDate: string, today: string): HeartRateRangeError | null {
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  if (!validDate(startDate) || !validDate(endDate)) return 'invalidDates';
  if (startDate > endDate) return 'orderDates';
  if (endDate > today) return 'futureEnd';
  const dayCount = (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000 + 1;
  if (dayCount > 30) return 'maxRange';
  return null;
}
