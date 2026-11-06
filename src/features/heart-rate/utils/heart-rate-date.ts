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

export function isFutureHcmDate(candidate: string, today: string) {
  return candidate > today;
}

export function heartRateSummaryPath(date: string) {
  return `/heart-rate/summary?date=${encodeURIComponent(date)}`;
}
