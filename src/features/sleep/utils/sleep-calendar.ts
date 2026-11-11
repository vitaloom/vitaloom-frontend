import type { Day } from '../types/sleep';

const dayPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDay(day: Day) {
  const match = dayPattern.exec(day);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const dateOfMonth = Number(match[3]);
  if (month < 1 || month > 12 || dateOfMonth < 1) return null;

  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, dateOfMonth);
  return date.toISOString().slice(0, 10) === day ? { year, month, dateOfMonth } : null;
}

function toDay(year: number, month: number, dateOfMonth: number): Day {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, dateOfMonth);
  return date.toISOString().slice(0, 10);
}

export function calendarMonthDays(month: Day): (Day | null)[] {
  const parsed = parseDay(month);
  if (!parsed) throw new RangeError('Provide a valid calendar day.');

  const firstDay = toDay(parsed.year, parsed.month, 1);
  const firstDate = new Date(`${firstDay}T00:00:00Z`);
  const mondayOffset = (firstDate.getUTCDay() + 6) % 7;
  const monthEnd = new Date(0);
  monthEnd.setUTCHours(0, 0, 0, 0);
  monthEnd.setUTCFullYear(parsed.year, parsed.month, 0);
  const daysInMonth = monthEnd.getUTCDate();
  const dates = Array.from({ length: mondayOffset }, () => null as Day | null);
  for (let dateOfMonth = 1; dateOfMonth <= daysInMonth; dateOfMonth += 1) {
    dates.push(toDay(parsed.year, parsed.month, dateOfMonth));
  }
  while (dates.length % 7 !== 0) dates.push(null);
  return dates;
}

export function calendarMonthStart(day: Day): Day {
  const parsed = parseDay(day);
  if (!parsed) throw new RangeError('Provide a valid calendar day.');
  return toDay(parsed.year, parsed.month, 1);
}

export function shiftCalendarMonth(day: Day, offset: number): Day | null {
  const parsed = parseDay(day);
  if (!parsed || !Number.isInteger(offset)) return null;
  const currentIndex = (parsed.year - 1) * 12 + parsed.month - 1;
  const nextIndex = currentIndex + offset;
  if (nextIndex < 0 || nextIndex >= 9999 * 12) return null;
  const year = Math.floor(nextIndex / 12) + 1;
  const month = (nextIndex % 12) + 1;
  return toDay(year, month, 1);
}
