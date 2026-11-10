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

export function getMonday(date: string) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return shiftCalendarDate(date, -((weekday + 6) % 7));
}

export function weekDates(date: string) {
  const monday = getMonday(date);
  return Array.from({ length: 7 }, (_, index) => shiftCalendarDate(monday, index));
}

export function isFutureHcmDate(candidate: string, today: string) {
  return candidate > today;
}

export function stepsSeriesPath(mode: 'day' | 'week' | 'custom', values: { date?: string; weekStartDate?: string; startDate?: string; endDate?: string }) {
  if (mode === 'day') return `/statistics/steps/daily?date=${encodeURIComponent(values.date ?? dateInHcm())}`;
  if (mode === 'week') return `/statistics/steps/weekly?weekStartDate=${encodeURIComponent(values.weekStartDate ?? getMonday(dateInHcm()))}`;
  return `/statistics/steps/custom?startDate=${encodeURIComponent(values.startDate ?? '')}&endDate=${encodeURIComponent(values.endDate ?? '')}`;
}
