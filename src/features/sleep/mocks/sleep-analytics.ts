import type {
  AiRequest, AiResponse, AnalyticsQuery, DailySummary, Day, EvidenceMeasure, Feeling, GoalEntry,
  GoalState, Insight, InsightCategory, InsightCode, InsightList, InsightStatus, SleepContext, SleepSession, WeeklySummary,
} from '../types/sleep';
import { offsetChanges, resolveCivil, shiftDay, startOfWeek } from '../utils/sleep-date';
import { sleepDuration } from '../utils/sleep-format';
import { distinctInsights } from '../utils/sleep-insights';

export type AnalyticsState = {
  sessions: readonly SleepSession[];
  goals: readonly GoalEntry[];
  goalRevision: number;
  context: SleepContext;
  version: string;
  verified: boolean;
  goalVerified: boolean;
  stale: boolean;
};

export function effectiveGoal(state: AnalyticsState, day: Day): GoalState {
  const entry = state.goals.reduce<GoalEntry | undefined>((best, goal) => (
    goal.effectiveDay <= day && (!best || goal.effectiveDay >= best.effectiveDay) ? goal : best
  ), undefined);
  return {
    minutes: state.goalVerified ? entry?.minutes ?? null : null,
    effectiveDay: state.goalVerified ? entry?.effectiveDay ?? null : null,
    verified: state.goalVerified,
    revision: state.goalRevision,
  };
}

export function dailySummary(state: AnalyticsState, day: Day): DailySummary {
  const goal = effectiveGoal(state, day);
  const sum = state.sessions.reduce((total, session) => session.day === day ? total + session.minutes : total, 0);
  const status = day > state.context.today ? 'future' : !state.verified ? 'unverified' : sum ? 'recorded' : 'no-data';
  return {
    day, status, minutes: status === 'recorded' ? sum : null, goal,
    progress: status === 'recorded' && goal.minutes ? sum / goal.minutes * 100 : null,
  };
}

type RecordedDay = DailySummary & { minutes: number };
const isRecorded = (day: DailySummary): day is RecordedDay => day.status === 'recorded' && day.minutes !== null;
const average = (items: readonly { minutes: number }[]) => items.reduce((sum, item) => sum + item.minutes, 0) / items.length;
const inPeriod = (items: readonly SleepSession[], from: Day, to: Day) => items.filter((item) => item.day >= from && item.day <= to);
const feelings = ['comfortable', 'normal', 'tired'] as const;
const feelingLabel = { comfortable: 'Comfortable', normal: 'Normal', tired: 'Tired' } as const;
const counts = (items: readonly SleepSession[]): Record<Feeling, number> => {
  const result = { comfortable: 0, normal: 0, tired: 0 };
  for (const session of items) if (session.feeling) result[session.feeling]++;
  return result;
};

function weekStats(state: AnalyticsState, week: Day) {
  const endDay = shiftDay(week, 6);
  const days = Array.from({ length: 7 }, (_, index) => dailySummary(state, shiftDay(week, index)));
  const logged = days.filter(isRecorded);
  const goalDays = logged.filter((day) => day.progress !== null);
  const sessions = inPeriod(state.sessions, week, endDay);
  const elapsedDays = days.filter((day) => day.day <= state.context.today).length;
  return {
    endDay, days, logged, goalDays, sessions, elapsedDays,
    complete: endDay < state.context.today,
    averageMinutes: logged.length ? average(logged) : null,
    goalMet: goalDays.filter((day) => (day.progress ?? 0) >= 100).length,
  };
}

type RangeSession = SleepSession & { method: 'range' };
function representatives(sessions: readonly SleepSession[]) {
  const groups = new Map<Day, RangeSession[]>();
  for (const session of sessions) {
    if (session.method !== 'range' || session.sleepType !== 'main') continue;
    const group = groups.get(session.day) ?? [];
    group.push(session);
    groups.set(session.day, group);
  }
  const selected: RangeSession[] = [];
  for (const group of groups.values()) {
    group.sort((left, right) => right.minutes - left.minutes);
    if (group[0].minutes !== group[1]?.minutes) selected.push(group[0]);
  }
  return selected;
}

function timingSample(records: readonly RangeSession[], week: Day, timeZone?: string) {
  if (!timeZone) return [];
  const first = resolveCivil({ day: week, hour: '00', minute: '00' }, timeZone);
  const next = resolveCivil({ day: shiftDay(week, 7), hour: '00', minute: '00' }, timeZone);
  if (first.kind !== 'resolved' || next.kind !== 'resolved') return [];
  if (offsetChanges(new Date(Date.parse(first.instant) - 1), new Date(Date.parse(next.instant) - 1), timeZone)) return [];
  return records.filter((record) => record.timeZone === timeZone
    && !offsetChanges(new Date(record.startAt), new Date(record.endAt), timeZone));
}

const codes: Record<InsightCode, { title: string; category: InsightCategory }> = {
  A01: { title: 'Recording Coverage', category: 'patterns' },
  A02: { title: 'Goal Achievement', category: 'patterns' },
  A03: { title: 'Duration Trend', category: 'patterns' },
  A04: { title: 'Bedtime and Wake Variation', category: 'patterns' },
  A05: { title: 'Weekday and Weekend Duration', category: 'patterns' },
  B01: { title: 'Feeling Distribution', category: 'feelings' },
  B02: { title: 'Duration vs Feeling', category: 'feelings' },
  B03: { title: 'Feeling Trend', category: 'feelings' },
  B04: { title: 'Tired Sessions at Goal', category: 'feelings' },
  C01: { title: 'Duration and Feeling Contrast', category: 'discoveries' },
  C03: { title: 'Duration and Feeling Trends', category: 'discoveries' },
  C04: { title: 'Tired Sessions That Met Goal', category: 'discoveries' },
};

const caveat = 'These observations describe self-reported sleep. The data cannot establish causes or measure sleep quality.';
const measure = (label: string, value: number, unit: EvidenceMeasure['unit'], detail?: string): EvidenceMeasure =>
  ({ label, value, unit, detail });

type Evidence = Pick<Insight, 'summary' | 'sample' | 'evidence' | 'sourceIds'> & { from?: Day; limitation?: string };
const sourceIds = (sessions: readonly SleepSession[]) => sessions.map(({ id }) => id);

export function insightList(state: AnalyticsState, query: AnalyticsQuery): InsightList {
  const { week, timeZone, sleepType = 'main' } = query;
  const current = weekStats(state, week);
  const previousWeek = shiftDay(week, -7);
  const previous = weekStats(state, previousWeek);
  const representative = representatives(current.sessions);
  const timeZones = [...new Set(representative.map((record) => record.timeZone))].sort();
  const listStatus = state.stale ? 'stale' : !state.verified ? 'unverified' : current.sessions.length ? 'ready' : 'no-data';
  const coverage = state.verified && !state.stale ? `${current.logged.length} of ${current.elapsedDays} days recorded` : 'Coverage unavailable';
  const item = (code: InsightCode, requirement: string, data?: Evidence, needsGoal = false): Insight => {
    const status: InsightStatus = state.stale ? 'stale'
      : !state.verified || (needsGoal && !state.goalVerified) ? 'unverified'
        : !current.sessions.length ? 'no-data' : data ? 'ready' : 'insufficient';
    const ready = status === 'ready' ? data : undefined;
    return {
      ...codes[code], key: { ...query, code, version: state.version }, status, eligible: Boolean(ready),
      period: { from: ready?.from ?? week, to: current.endDay, complete: current.complete },
      summary: ready?.summary ?? (status === 'insufficient' ? requirement : ''),
      sample: ready?.sample ?? '', coverage,
      evidence: ready?.evidence ?? [], sourceIds: ready?.sourceIds ?? [],
      limitations: ready ? [caveat, ...(ready.limitation ? [ready.limitation] : [])] : [],
    };
  };

  if (listStatus !== 'ready') {
    return { items: (Object.keys(codes) as InsightCode[]).map((code) => item(code, '')), timeZones: [], status: listStatus };
  }

  const recorded = current.logged.length;
  const a01 = item('A01', 'Requires records on at least three days.', recorded >= 3 ? {
    summary: `You recorded sleep on ${recorded} of ${current.elapsedDays} days.`,
    sample: `${recorded} recorded days`,
    evidence: [measure('Days with a record', recorded, 'days'), measure('Elapsed calendar days', current.elapsedDays, 'days')],
    sourceIds: sourceIds(current.sessions),
  } : undefined);

  const goalDates = new Set(current.goalDays.map(({ day }) => day));
  const a02 = item('A02', 'Requires at least three recorded days with a verified effective goal.', goalDates.size >= 3 ? {
    summary: `You met your effective goal on ${current.goalMet} of ${goalDates.size} eligible days.`,
    sample: `${goalDates.size} recorded days with a goal`,
    evidence: [measure('Days that met goal', current.goalMet, 'days'), measure('Days with data and goal', goalDates.size, 'days')],
    sourceIds: sourceIds(current.sessions.filter((session) => goalDates.has(session.day))),
    limitation: 'Only recorded days with a verified goal enter the comparison.',
  } : undefined, true);

  const pairedDuration = current.complete && current.averageMinutes !== null && previous.averageMinutes !== null
    && recorded >= 3 && previous.logged.length >= 3;
  const durationTrend = pairedDuration ? {
    from: previousWeek,
    summary: `Average recorded sleep was ${sleepDuration(current.averageMinutes!)} per day, compared with ${sleepDuration(previous.averageMinutes!)} the prior week.`,
    sample: `${recorded} days this week and ${previous.logged.length} days the prior week`,
    evidence: [
      measure('Selected week average', current.averageMinutes!, 'minutes'),
      measure('Previous week average', previous.averageMinutes!, 'minutes'),
    ],
    sourceIds: sourceIds([...current.sessions, ...previous.sessions]),
    limitation: 'Both weeks are complete. Averages use only recorded days.',
  } : undefined;
  const a03 = item('A03', 'Requires two consecutive completed weeks with at least three recorded days each.', durationTrend);

  const timing = timingSample(representative, week, timeZone);
  const relativeMinute = (session: RangeSession, field: 'start' | 'end') => {
    const value = session[field];
    const dayDelta = (Date.parse(`${value.day}T00:00Z`) - Date.parse(`${session.day}T00:00Z`)) / 86_400_000;
    return dayDelta * 1440 + Number(value.hour) * 60 + Number(value.minute);
  };
  const spread = (field: 'start' | 'end') => {
    const minutes = timing.map((record) => relativeMinute(record, field));
    return Math.max(...minutes) - Math.min(...minutes);
  };
  const a04 = item('A04', 'Choose a reference timezone with at least three eligible timing days and no transition in the week.', timing.length >= 3 ? {
    summary: `Bedtimes varied by ${spread('start')} minutes and wake times by ${spread('end')} minutes in ${timeZone}.`,
    sample: `${timing.length} representative main sleep sessions`,
    evidence: [measure('Bedtime spread', spread('start'), 'minutes'), measure('Wake time spread', spread('end'), 'minutes')],
    sourceIds: sourceIds(timing),
    limitation: 'Uses the longest eligible main sleep time range per day, excluding tied days and clock changes.',
  } : undefined);

  const weekdays = current.days.slice(0, 5).filter(isRecorded);
  const weekends = current.days.slice(5).filter(isRecorded);
  const a05 = item('A05', 'Requires at least three recorded weekdays and two weekend days in a completed week.',
    current.complete && weekdays.length >= 3 && weekends.length >= 2 ? {
      summary: `Average recorded sleep was ${sleepDuration(average(weekdays))} on weekdays and ${sleepDuration(average(weekends))} on weekend days.`,
      sample: `${weekdays.length} weekdays and ${weekends.length} weekend days`,
      evidence: [measure('Weekday average', average(weekdays), 'minutes'), measure('Weekend average', average(weekends), 'minutes')],
      sourceIds: sourceIds(current.sessions),
    } : undefined);

  const selectedType = current.sessions.filter((session) => session.sleepType === sleepType);
  const assessed = selectedType.filter((session) => session.feeling);
  const distribution = counts(assessed);
  const typeName = sleepType === 'main' ? 'main sleep' : 'nap';
  const b01 = item('B01', `Requires at least three assessed ${typeName} sessions.`, assessed.length >= 3 ? {
    summary: `Across ${assessed.length} assessed ${typeName} sessions, Comfortable was selected ${distribution.comfortable} times, Normal ${distribution.normal} and Tired ${distribution.tired}.`,
    sample: `${assessed.length} of ${selectedType.length} ${typeName} sessions assessed`,
    evidence: [
      ...feelings.map((feeling) => measure(feelingLabel[feeling], distribution[feeling], 'sessions',
        `${distribution[feeling]}/${assessed.length} · ${Math.round(distribution[feeling] / assessed.length * 100)}%`)),
      measure('Without a feeling', selectedType.length - assessed.length, 'sessions'),
    ],
    sourceIds: sourceIds(assessed),
  } : undefined);

  const main = current.sessions.filter((session) => session.sleepType === 'main' && session.feeling);
  const priorMain = previous.sessions.filter((session) => session.sleepType === 'main' && session.feeling);
  const comfortable = main.filter((session) => session.feeling === 'comfortable');
  const tired = main.filter((session) => session.feeling === 'tired');
  const contrast = comfortable.length >= 4 && tired.length >= 4 ? {
    summary: `Main sleep averaged ${sleepDuration(average(comfortable))} with Comfortable and ${sleepDuration(average(tired))} with Tired.`,
    sample: `${comfortable.length} Comfortable and ${tired.length} Tired main sleep sessions`,
    evidence: [
      measure('Comfortable average', average(comfortable), 'minutes', `${comfortable.length} sessions`),
      measure('Tired average', average(tired), 'minutes', `${tired.length} sessions`),
      measure('Difference', average(comfortable) - average(tired), 'minutes', 'Comfortable minus Tired'),
    ],
    sourceIds: sourceIds([...comfortable, ...tired]),
    limitation: 'Each group contains assessed main sleep sessions. Other feelings and naps are excluded.',
  } : undefined;
  const b02 = item('B02', 'Requires four Comfortable and four Tired main sleep sessions.', contrast);

  const currentFeelings = counts(main);
  const previousFeelings = counts(priorMain);
  const feelingTrend = current.complete && main.length >= 3 && priorMain.length >= 3 ? {
    from: previousWeek,
    summary: 'Compare the share of each feeling across two completed weeks of assessed main sleep.',
    sample: `${main.length} assessed sessions this week and ${priorMain.length} the prior week`,
    evidence: feelings.flatMap((feeling) => [
      measure(`${feelingLabel[feeling]} · selected week`, currentFeelings[feeling] / main.length * 100, 'percent', `${currentFeelings[feeling]}/${main.length}`),
      measure(`${feelingLabel[feeling]} · previous week`, previousFeelings[feeling] / priorMain.length * 100, 'percent', `${previousFeelings[feeling]}/${priorMain.length}`),
    ]),
    sourceIds: sourceIds([...main, ...priorMain]),
  } : undefined;
  const b03 = item('B03', 'Requires at least three assessed main sleep sessions in each of two consecutive completed weeks.', feelingTrend);

  const goalAssessed = main.filter((session) => effectiveGoal(state, session.day).minutes !== null);
  const exceptions = goalAssessed.filter((session) => session.feeling === 'tired' && session.minutes >= effectiveGoal(state, session.day).minutes!);
  const tiredAtGoal = main.length >= 3 && exceptions.length ? {
    summary: `${exceptions.length} of ${goalAssessed.length} assessed main sleep sessions with an effective goal met it and were marked Tired.`,
    sample: `${goalAssessed.length} assessed sessions with an effective goal out of ${main.length} assessed main sleep sessions`,
    evidence: [
      measure('Tired sessions at goal', exceptions.length, 'sessions'),
      ...exceptions.map((session) => measure(`Effective goal · ${session.day}`, effectiveGoal(state, session.day).minutes!,
        'minutes', `${sleepDuration(session.minutes)} recorded`)),
    ],
    sourceIds: sourceIds(goalAssessed),
    limitation: 'Each session is compared with its own effective personal goal.',
  } : undefined;
  const b04 = item('B04', 'Requires at least three assessed main sleep sessions and a verified Tired session that met its goal.', tiredAtGoal, true);

  const c01 = item('C01', 'Requires an eligible Duration vs Feeling comparison.', contrast && {
    ...contrast, summary: `${contrast.summary}`,
  });
  const c03 = item('C03', 'Requires eligible duration and feeling trends for both weeks.', durationTrend && feelingTrend ? {
    from: previousWeek,
    summary: `${durationTrend.summary} Feeling counts come from assessed main sleep sessions.`,
    sample: `${durationTrend.sample}. ${feelingTrend.sample}.`,
    evidence: [...durationTrend.evidence, ...feelingTrend.evidence],
    sourceIds: [...new Set([...durationTrend.sourceIds, ...feelingTrend.sourceIds])],
    limitation: 'Duration averages are per recorded day. Feelings are reported per assessed session.',
  } : undefined);
  const c04 = item('C04', 'Requires eligible Tired sessions at a verified personal goal.', tiredAtGoal, true);
  return { items: [a01, a02, a03, a04, a05, b01, b02, b03, b04, c01, c03, c04], timeZones, status: listStatus };
}

const priority: InsightCode[] = ['C01', 'C03', 'C04', 'A03', 'A05', 'B01', 'B02', 'B03', 'B04', 'A02', 'A04', 'A01'];
const order = (items: readonly Insight[]) => [...items].sort((a, b) => priority.indexOf(a.key.code) - priority.indexOf(b.key.code));
const advanced = (item: Insight) => item.key.code === 'A05' || item.category !== 'patterns';

export function featuredInsight(state: AnalyticsState): Insight | null {
  const current = startOfWeek(state.context.today);
  const candidates = distinctInsights([
    ...insightList(state, { week: current }).items,
    ...insightList(state, { week: shiftDay(current, -7) }).items,
  ]);
  return order(candidates)[0] ?? null;
}

export function weeklySummary(state: AnalyticsState, query: AnalyticsQuery): WeeklySummary {
  const stats = weekStats(state, query.week);
  const list = insightList(state, query);
  const insights = order(distinctInsights(list.items));
  return {
    week: query.week, endDay: stats.endDay, complete: stats.complete, verified: state.verified, version: state.version,
    days: stats.days, averageMinutes: stats.averageMinutes, recordedDays: state.verified ? stats.logged.length : null,
    elapsedDays: stats.elapsedDays,
    goalMet: state.verified && state.goalVerified ? stats.goalMet : null,
    goalEligible: state.verified && state.goalVerified ? stats.goalDays.length : null,
    feelings: state.verified ? counts(stats.sessions) : null,
    insights, timeZones: list.timeZones,
    storyEligible: stats.complete && state.verified && insights.some(advanced),
  };
}

export function aiFixture(state: AnalyticsState, request: AiRequest, consent: boolean, unavailable: boolean): AiResponse {
  const version = request.kind === 'story' ? request.version : request.insight.version;
  if (state.stale || version !== state.version) return { status: 'stale' };
  const candidates = request.kind === 'story'
    ? (() => {
        const report = weeklySummary(state, request.query);
        return report.storyEligible ? report.insights.filter(advanced).slice(0, 2) : [];
      })()
    : insightList(state, request.insight).items.filter((item) => item.eligible && item.key.code === request.insight.code);
  if (candidates.length === 0) return { status: 'ineligible' };
  if (!consent) return { status: 'consent-required' };
  if (unavailable) return { status: 'unavailable' };
  return {
    status: 'fixture', version, headline: request.kind === 'story' ? 'Recorded sleep this week' : 'How to read this evidence',
    observations: candidates.map((item) => item.summary),
    limitations: caveat,
    sources: candidates.map((item) => item.key.code),
  };
}
