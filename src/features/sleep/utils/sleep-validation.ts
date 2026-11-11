import type { Feeling, SessionValue, SleepContext, SleepDraft, SleepSession } from '../types/sleep';
import { dayInZone, resolveCivil } from './sleep-date';

type Validation = { kind: 'validation'; field: string; message: string };
type ValidSession = { kind: 'valid'; value: SessionValue };
type SessionValidation = Validation | ValidSession;

const feelings = new Set<Feeling>(['comfortable', 'normal', 'tired']);
const validDay = (day: string) => {
  try {
    return new Date(`${day}T00:00:00.000Z`).toISOString().slice(0, 10) === day;
  } catch {
    return false;
  }
};

function validFeeling(value: string | null): boolean {
  return value === null || feelings.has(value as Feeling);
}

export function validateSession(
  draft: SleepDraft,
  context: SleepContext,
  now: Date,
  existing?: SleepSession,
): SessionValidation {
  if (draft.sleepType !== 'main' && draft.sleepType !== 'nap') {
    return { kind: 'validation', field: 'sleepType', message: 'Choose Main Sleep or Nap.' };
  }
  if (!validFeeling(draft.feeling)) return { kind: 'validation', field: 'feeling', message: 'Choose one of the available feelings.' };

  let value: SessionValue;
  if (draft.method === 'duration') {
    if (!validDay(draft.endDay)) return { kind: 'validation', field: 'endDay', message: 'Choose a valid end date.' };
    if (draft.endDay > dayInZone(now, context.timeZone)) return { kind: 'validation', field: 'endDay', message: 'Sleep cannot be recorded for a future date.' };
    if (!/^\d+$/.test(draft.hours) || !/^\d+$/.test(draft.minutes)) return { kind: 'validation', field: 'duration', message: 'Enter whole hours and minutes.' };
    const hours = Number(draft.hours);
    const minutes = Number(draft.minutes);
    const total = hours * 60 + minutes;
    if (minutes > 59 || total < 1 || total > 1440) return { kind: 'validation', field: 'duration', message: 'Duration must be between 1 and 1,440 minutes.' };
    value = { method: 'duration', sleepType: draft.sleepType, feeling: draft.feeling, day: draft.endDay, minutes: total };
  } else {
    if (!validDay(draft.start.day) || !validDay(draft.end.day)) return { kind: 'validation', field: 'time', message: 'Choose valid start and end dates.' };
    if (existing?.method === 'range' && draft.timeZone !== existing.timeZone) {
      return { kind: 'validation', field: 'timeZone', message: 'Keep the reference timezone saved with this record.' };
    }
    const start = resolveCivil(draft.start, draft.timeZone);
    const end = resolveCivil(draft.end, draft.timeZone);
    if (start.kind !== 'resolved' || end.kind !== 'resolved') return {
      kind: 'validation',
      field: start.kind !== 'resolved' ? 'start' : 'end',
      message: 'Choose an unambiguous local time, including its offset where clocks repeat.',
    };
    const startAt = new Date(start.instant);
    const endAt = new Date(end.instant);
    const elapsedMinutes = (endAt.getTime() - startAt.getTime()) / 60_000;
    if (!Number.isInteger(elapsedMinutes) || elapsedMinutes < 1 || elapsedMinutes > 1440) {
      return { kind: 'validation', field: 'end', message: 'Sleep duration must be between 1 and 1,440 minutes.' };
    }
    if (dayInZone(startAt, draft.timeZone) > dayInZone(now, draft.timeZone) || dayInZone(endAt, draft.timeZone) > dayInZone(now, draft.timeZone)
      || endAt.getTime() > now.getTime()) {
      return { kind: 'validation', field: 'end', message: 'Sleep cannot be recorded in the future.' };
    }
    value = {
      method: 'range', sleepType: draft.sleepType, feeling: draft.feeling, day: draft.end.day,
      minutes: elapsedMinutes, timeZone: draft.timeZone,
      start: { ...draft.start, hour: draft.start.hour.padStart(2, '0'), minute: draft.start.minute.padStart(2, '0') },
      end: { ...draft.end, hour: draft.end.hour.padStart(2, '0'), minute: draft.end.minute.padStart(2, '0') },
      startAt: start.instant, endAt: end.instant,
    };
  }
  return { kind: 'valid', value };
}

export function validateGoal(hours: string, minutes: string): { kind: 'valid'; minutes: number } | Validation {
  if (!/^\d+$/.test(hours) || !/^\d+$/.test(minutes)) return { kind: 'validation', field: 'goal', message: 'Enter hours and minutes as whole numbers.' };
  const hourCount = Number(hours);
  const minuteCount = Number(minutes);
  if (hourCount < 1 || hourCount > 24 || ![0, 15, 30, 45].includes(minuteCount) || (hourCount === 24 && minuteCount !== 0)) {
    return { kind: 'validation', field: 'goal', message: 'Goal must be 1–24 hours in 15-minute steps, up to 24:00.' };
  }
  return { kind: 'valid', minutes: hourCount * 60 + minuteCount };
}
