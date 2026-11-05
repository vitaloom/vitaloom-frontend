import type { LocalDate } from '../types/water';

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Return the device-local calendar date for an instant. */
export function localDateFromInstant(date: Date): LocalDate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parse a valid YYYY-MM-DD calendar value at local midnight. */
export function parseLocalDate(value: LocalDate): Date | null {
  const match = LOCAL_DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return parsed;
}

/** Return the Monday of the local calendar week containing the given date. */
export function getMondayOfWeek(localDate: LocalDate): LocalDate {
  const parsed = parseLocalDate(localDate);
  if (!parsed) throw new RangeError(`Invalid local date: ${localDate}`);

  const monday = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const daysSinceMonday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - daysSinceMonday);
  return localDateFromInstant(monday);
}

/** Return seven ascending local calendar dates beginning on a Monday. */
export function getSevenDatesFromMonday(monday: LocalDate): LocalDate[] {
  const parsed = parseLocalDate(monday);
  if (!parsed) throw new RangeError(`Invalid local date: ${monday}`);
  if (parsed.getDay() !== 1) throw new RangeError(`Week start must be Monday: ${monday}`);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate() + index);
    return localDateFromInstant(date);
  });
}

export function isFutureInstant(date: Date, now: Date): boolean {
  return Number.isNaN(date.getTime()) || date.getTime() > now.getTime();
}

export function formatAmountMl(amountMl: number): string {
  return `${new Intl.NumberFormat().format(amountMl)} ml`;
}
