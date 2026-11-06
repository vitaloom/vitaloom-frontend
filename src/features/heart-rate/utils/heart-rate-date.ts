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
  const fmt = new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', day: '2-digit', month: '2-digit' });
  return `${fmt.format(start)}–${fmt.format(end)}/${end.getUTCFullYear()}`;
}

export function isFutureHcmDate(candidate: string, today: string) {
  return candidate > today;
}

export function heartRateSummaryPath(date: string) {
  return `/heart-rate/summary?date=${encodeURIComponent(date)}`;
}
