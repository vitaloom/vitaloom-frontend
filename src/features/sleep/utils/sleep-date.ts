import type { CivilTime, Day } from '../types/sleep';

const dayPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const formatters = new Map<string, Intl.DateTimeFormat>();

function parsedDay(day: Day): Date | null {
  const match = dayPattern.exec(day);
  if (!match) return null;
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toISOString().slice(0, 10) === day ? date : null;
}

export function shiftDay(day: Day, days: number): Day {
  const date = parsedDay(day);
  if (!date || !Number.isInteger(days)) throw new RangeError('Provide a valid calendar day and whole-day offset.');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function startOfWeek(day: Day): Day {
  const date = parsedDay(day);
  if (!date) throw new RangeError('Provide a valid calendar day.');
  return shiftDay(day, -((date.getUTCDay() + 6) % 7));
}

function partsAt(date: Date, timeZone: string): Record<string, string> {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone, calendar: 'iso8601', numberingSystem: 'latn',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
      minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    });
    formatters.set(timeZone, formatter);
  }
  const values = formatter.formatToParts(date);
  return Object.fromEntries(values.map(({ type, value }) => [type, value]));
}

function validTimeZone(timeZone: string): boolean {
  if (!timeZone || /^[+-]/.test(timeZone)) return false;
  if (formatters.has(timeZone)) return true;
  try {
    partsAt(new Date(0), timeZone);
    return true;
  } catch {
    return false;
  }
}

function offsetAt(date: Date, timeZone: string): number {
  const local = partsAt(date, timeZone);
  const localAsUtcDate = new Date(0);
  localAsUtcDate.setUTCFullYear(Number(local.year), Number(local.month) - 1, Number(local.day));
  localAsUtcDate.setUTCHours(Number(local.hour), Number(local.minute), Number(local.second), 0);
  const localAsUtc = localAsUtcDate.getTime();
  const wholeSecond = Math.floor(date.getTime() / 1000) * 1000;
  return (localAsUtc - wholeSecond) / 60_000;
}

function datePart(parts: Record<string, string>): Day {
  return `${parts.year.padStart(4, '0')}-${parts.month}-${parts.day}`;
}

export function dayInZone(date: Date, timeZone: string): Day {
  if (!Number.isFinite(date.getTime()) || !validTimeZone(timeZone)) throw new RangeError('Provide a valid instant and IANA timezone.');
  const parts = partsAt(date, timeZone);
  return datePart(parts);
}

export function civilInZone(date: Date, timeZone: string): CivilTime {
  const parts = partsAt(date, timeZone);
  return { day: datePart(parts), hour: parts.hour, minute: parts.minute, offsetMinutes: offsetAt(date, timeZone) };
}

export function resolveCivil(time: CivilTime, timeZone: string):
  | { kind: 'resolved'; instant: string }
  | { kind: 'ambiguous'; options: number[] }
  | { kind: 'invalid' } {
  const date = parsedDay(time.day);
  if (!date || !validTimeZone(timeZone) || !/^\d{1,2}$/.test(time.hour) || !/^\d{1,2}$/.test(time.minute)) return { kind: 'invalid' };
  const hour = Number(time.hour);
  const minute = Number(time.minute);
  if (hour > 23 || minute > 59) return { kind: 'invalid' };
  const localAsUtcDate = new Date(0);
  localAsUtcDate.setUTCFullYear(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  localAsUtcDate.setUTCHours(hour, minute, 0, 0);
  const localAsUtc = localAsUtcDate.getTime();
  const offsets = new Set<number>();
  for (let hours = -36; hours <= 36; hours += 3) {
    offsets.add(offsetAt(new Date(localAsUtc + hours * 3_600_000), timeZone));
  }
  const matches = [...offsets]
    .map((offsetMinutes) => ({ offsetMinutes, instant: new Date(localAsUtc - Math.round(offsetMinutes * 60_000)) }))
    .filter(({ offsetMinutes, instant }) => {
      const candidate = civilInZone(instant, timeZone);
      return candidate.day === time.day && candidate.hour === time.hour.padStart(2, '0') && candidate.minute === time.minute.padStart(2, '0')
        && (time.offsetMinutes === undefined || time.offsetMinutes === offsetMinutes);
    })
    .sort((left, right) => left.instant.getTime() - right.instant.getTime());

  if (matches.length === 0) return { kind: 'invalid' };
  if (matches.length > 1 && time.offsetMinutes === undefined) {
    return { kind: 'ambiguous', options: matches.map(({ offsetMinutes }) => offsetMinutes) };
  }
  return { kind: 'resolved', instant: matches[0].instant.toISOString() };
}

export function offsetChanges(from: Date, to: Date, timeZone: string): boolean {
  if (to.getTime() <= from.getTime()) return false;
  const initial = offsetAt(from, timeZone);
  for (let timestamp = from.getTime() + 30 * 60_000; timestamp < to.getTime(); timestamp += 30 * 60_000) {
    if (offsetAt(new Date(timestamp), timeZone) !== initial) return true;
  }
  return offsetAt(to, timeZone) !== initial;
}
