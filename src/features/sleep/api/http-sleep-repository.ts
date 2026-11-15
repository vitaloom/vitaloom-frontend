import { ApiError, apiRequest } from '../../../lib/api/http-client';
import { dayInZone } from '../utils/sleep-date';
import { validateSession } from '../utils/sleep-validation';
import type { SleepRepository } from './sleep-repository';
import type {
  AiRequest, AiResponse, AnalyticsQuery, DailySummary, Day, Feeling, GoalState, HomeSummary, Insight,
  InsightKey, InsightList, JournalPage, JournalQuery, Mutation, ReadResult, SleepContext, SleepSession,
  RecentSleepDay, RecentSleepHighlight, RecentSleepInsight, RecentSleepReport, WeeklySummary, WriteResult,
  SleepInsightDetail, SleepInsightItem, SleepInsightList, SleepInsightPeriod, SleepInsightStatus,
  AiConsent, RecentStory,
} from '../types/sleep';

const apiBase = '/sleep/v2';
const reportingZone = 'Asia/Ho_Chi_Minh';
const requestDeadlineMs = 15_000;

type Requester = <T>(path: string, init?: RequestInit, authenticated?: boolean) => Promise<T>;
type ApiCivilTime = { day: string; hour: string; minute: string; offsetMinutes?: number | null };
type ApiSession = {
  id: string;
  confirmedAt: string;
  editable?: boolean;
  sleepType: 'MAIN' | 'NAP';
  method: 'RANGE' | 'DURATION';
  feeling?: 'COMFORTABLE' | 'NORMAL' | 'TIRED' | null;
  day: string;
  minutes: number;
  timeZone?: string | null;
  start?: ApiCivilTime | null;
  end?: ApiCivilTime | null;
  startAt?: string | null;
  endAt?: string | null;
};

const unavailable = (operation: string) => ({
  kind: 'error' as const,
  message: `${operation} is not available from the Sleep Journal service.`,
});

function mapSession(value: ApiSession): SleepSession {
  if (!value || typeof value.id !== 'string' || typeof value.confirmedAt !== 'string'
    || Number.isNaN(Date.parse(value.confirmedAt)) || !/^\d{4}-\d{2}-\d{2}$/.test(value.day)
    || !Number.isInteger(value.minutes) || value.minutes < 1 || value.minutes > 1440) {
    throw new Error('Sleep service returned an invalid session.');
  }
  const sleepType: 'main' | 'nap' | null = value.sleepType === 'MAIN' ? 'main' : value.sleepType === 'NAP' ? 'nap' : null;
  const feeling = value.feeling == null ? null : value.feeling.toLowerCase() as Feeling;
  if (!sleepType || (feeling !== null && !['comfortable', 'normal', 'tired'].includes(feeling))) {
    throw new Error('Sleep service returned an invalid session classification.');
  }
  const base = {
    id: value.id, revision: 1, confirmedAt: value.confirmedAt, editable: sleepType === 'main' && value.editable === true, sleepType, feeling,
    day: value.day, minutes: value.minutes,
  };
  if (value.method === 'DURATION') {
    if (value.startAt != null || value.endAt != null || value.start != null || value.end != null || value.timeZone != null) {
      throw new Error('Duration session contains time range data.');
    }
    return { ...base, method: 'duration' };
  }
  if (value.method !== 'RANGE' || !value.timeZone || !value.start || !value.end
    || !value.startAt || !value.endAt || Number.isNaN(Date.parse(value.startAt))
    || Number.isNaN(Date.parse(value.endAt)) || Date.parse(value.endAt) <= Date.parse(value.startAt)) {
    throw new Error('Sleep service returned an invalid time range.');
  }
  const civil = ({ day, hour, minute, offsetMinutes }: ApiCivilTime) => ({
    day, hour, minute, ...(offsetMinutes == null ? {} : { offsetMinutes }),
  });
  return {
    ...base, method: 'range', timeZone: value.timeZone,
    start: civil(value.start), end: civil(value.end), startAt: value.startAt, endAt: value.endAt,
  };
}

function toApiWrite(value: ReturnType<typeof validateSession> & { kind: 'valid' }) {
  const session = value.value;
  const common = {
    sleepType: 'MAIN',
    method: session.method.toUpperCase(),
    feeling: session.feeling?.toUpperCase() ?? null,
  };
  if (session.method === 'duration') return { ...common, endDay: session.day, minutes: session.minutes };
  const civil = (time: typeof session.start) => ({
    day: time.day, hour: time.hour, minute: time.minute,
    ...(time.offsetMinutes === undefined ? {} : { offsetMinutes: time.offsetMinutes }),
  });
  return { ...common, timeZone: session.timeZone, start: civil(session.start), end: civil(session.end) };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Sleep request failed.';
}

function isCivilDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function readAiConsent(value: unknown): AiConsent {
  const consent = value as Partial<AiConsent> | null | undefined;
  if (typeof consent?.enabled !== 'boolean' || typeof consent.available !== 'boolean') {
    throw new Error('Sleep service returned invalid AI consent.');
  }
  return { enabled: consent.enabled, available: consent.available };
}

function invalidRecentReport(): never {
  throw new Error('Sleep service returned an invalid Recent report.');
}

const insightStatuses: readonly SleepInsightStatus[] = ['READY', 'INSUFFICIENT_DATA', 'NO_DATA', 'UNVERIFIED_DATA'];

function mapInsightPeriod(value: unknown): SleepInsightPeriod {
  if (!value || typeof value !== 'object') throw new Error('Sleep service returned an invalid Insight period.');
  const period = value as Record<string, unknown>;
  if (!isCivilDay(period.start) || !isCivilDay(period.end) || typeof period.timeZone !== 'string' || !period.timeZone) {
    throw new Error('Sleep service returned an invalid Insight period.');
  }
  return { start: period.start, end: period.end, timeZone: period.timeZone };
}

function mapInsightItem(value: unknown): SleepInsightItem {
  if (!value || typeof value !== 'object') throw new Error('Sleep service returned an invalid Insight.');
  const item = value as Record<string, unknown>;
  const category = item.category;
  const code = item.code;
  if ((code !== 'A01' && code !== 'B01') || category !== (code === 'A01' ? 'A' : 'B')
    || !insightStatuses.includes(item.status as SleepInsightStatus) || typeof item.title !== 'string' || !item.title
    || typeof item.locked !== 'boolean') {
    throw new Error('Sleep service returned an invalid Insight.');
  }
  const status = item.status as SleepInsightStatus;
  if ((status === 'READY' && item.locked) || (status !== 'READY' && !item.locked)) {
    throw new Error('Sleep service returned an invalid Insight publication state.');
  }
  if (item.summary !== undefined && typeof item.summary !== 'string') throw new Error('Sleep service returned an invalid Insight summary.');
  return item as unknown as SleepInsightItem;
}

export function mapSleepInsightList(value: unknown): SleepInsightList {
  if (!value || typeof value !== 'object') throw new Error('Sleep service returned an invalid Insights list.');
  const response = value as Record<string, unknown>;
  if (!Array.isArray(response.items)) throw new Error('Sleep service returned an invalid Insights list.');
  return { period: mapInsightPeriod(response.period), items: response.items.map(mapInsightItem) };
}

export function mapSleepInsightDetail(value: unknown, expectedCode: 'A01' | 'B01'): SleepInsightDetail {
  if (!value || typeof value !== 'object') throw new Error('Sleep service returned an invalid Insight detail.');
  const detail = value as Record<string, unknown>;
  const code = detail.code;
  if (code !== expectedCode || detail.category !== (code === 'A01' ? 'A' : 'B')
    || !insightStatuses.includes(detail.status as SleepInsightStatus) || typeof detail.title !== 'string' || !detail.title
    || detail.sourceRefs === undefined || detail.limitations === undefined
    || typeof detail.policyVersion !== 'string' || typeof detail.evidenceVersion !== 'string'
    || (detail.summary !== undefined && typeof detail.summary !== 'string')) {
    throw new Error('Sleep service returned an invalid Insight detail.');
  }
  return { ...detail, period: mapInsightPeriod(detail.period) } as unknown as SleepInsightDetail;
}

export function mapRecentSleepReport(value: unknown): RecentSleepReport {
  if (!value || typeof value !== 'object') return invalidRecentReport();
  const report = value as Record<string, unknown>;
  const period = report.period;
  if (!period || typeof period !== 'object') return invalidRecentReport();
  const { start, end, timeZone } = period as Record<string, unknown>;
  if (!isCivilDay(start) || !isCivilDay(end) || timeZone !== reportingZone) return invalidRecentReport();
  const firstDay = new Date(`${start}T00:00:00Z`);
  const lastDay = new Date(`${end}T00:00:00Z`);
  if (lastDay.getTime() - firstDay.getTime() !== 6 * 86400000) return invalidRecentReport();
  if (!Array.isArray(report.days) || report.days.length !== 7) return invalidRecentReport();

  const days: RecentSleepDay[] = report.days.map((entry, index) => {
    if (!entry || typeof entry !== 'object') return invalidRecentReport();
    const day = entry as Record<string, unknown>;
    const expectedDay = new Date(firstDay.getTime() + index * 86400000).toISOString().slice(0, 10);
    if (day.day !== expectedDay || !isCivilDay(day.day)) return invalidRecentReport();
    if (day.status === 'RECORDED' && Number.isInteger(day.minutes) && Number(day.minutes) >= 1 && Number(day.minutes) <= 1440) {
      return { day: day.day, status: 'recorded', minutes: Number(day.minutes) };
    }
    if ((day.status === 'NOT_RECORDED' || day.status === 'UNVERIFIED') && day.minutes === null) {
      return { day: day.day, status: day.status === 'NOT_RECORDED' ? 'not-recorded' : 'unverified', minutes: null };
    }
    return invalidRecentReport();
  });

  const recorded = days.filter((day) => day.status === 'recorded').length;
  const status = report.dataStatus;
  const insights = report.insights;
  if (report.coverageDenominator !== 7 || !Array.isArray(insights)) return invalidRecentReport();
  let highlights: RecentSleepHighlight[] | undefined;
  if (report.highlights !== undefined) {
    if (!Array.isArray(report.highlights)) return invalidRecentReport();
    const codes = new Set<string>();
    highlights = report.highlights.slice(0, 3).map((value) => {
      if (!value || typeof value !== 'object') return invalidRecentReport();
      const item = value as Record<string, unknown>;
      if ((item.code !== 'A01' && item.code !== 'B01') || item.status !== 'READY'
        || typeof item.title !== 'string' || !item.title || typeof item.summary !== 'string') return invalidRecentReport();
      if (codes.has(item.code)) return invalidRecentReport();
      codes.add(item.code);
      return { code: item.code, status: 'READY', title: item.title, summary: item.summary };
    });
  }
  let dataStatus: RecentSleepReport['dataStatus'];
  let recordedDays: number | null;
  let average: number | null;
  let mappedInsights: RecentSleepInsight[];

  if (status === 'UNVERIFIED_DATA') {
    if (days.some((day) => day.status === 'not-recorded') || report.recordedDays !== null
      || report.averageMinutesPerRecordedDay !== null || insights.length !== 0) return invalidRecentReport();
    dataStatus = 'unverified-data';
    recordedDays = null;
    average = null;
    mappedInsights = [];
  } else if (status === 'NO_DATA') {
    if (recorded !== 0 || days.some((day) => day.status !== 'not-recorded') || report.recordedDays !== 0
      || report.averageMinutesPerRecordedDay !== null || insights.length !== 0) return invalidRecentReport();
    dataStatus = 'no-data';
    recordedDays = 0;
    average = null;
    mappedInsights = [];
  } else if (status === 'VERIFIED') {
    if (recorded === 0 || days.some((day) => day.status === 'unverified') || report.recordedDays !== recorded
      || !Number.isInteger(report.averageMinutesPerRecordedDay) || Number(report.averageMinutesPerRecordedDay) < 1
      || Number(report.averageMinutesPerRecordedDay) > 1440) {
      return invalidRecentReport();
    }
    dataStatus = 'verified';
    recordedDays = recorded;
    average = report.averageMinutesPerRecordedDay as number | null;
    if (recorded >= 3) {
      if (insights.length !== 1) return invalidRecentReport();
      const insight = insights[0];
      if (!insight || typeof insight !== 'object') return invalidRecentReport();
      const item = insight as Record<string, unknown>;
      if (item.code !== 'A01' || item.status !== 'READY' || item.sampleDays !== recorded || item.denominatorDays !== 7) return invalidRecentReport();
      mappedInsights = [{ code: 'A01', status: 'ready', sampleDays: recorded, denominatorDays: 7 }];
    } else {
      if (insights.length !== 0) return invalidRecentReport();
      mappedInsights = [];
    }
  } else {
    return invalidRecentReport();
  }

  return {
    period: { start, end, timeZone },
    dataStatus, days, recordedDays, coverageDenominator: 7,
    averageMinutesPerRecordedDay: average,
    insights: mappedInsights, ...(highlights === undefined ? {} : { highlights }),
  };
}

function dailySummary(day: string, sessions: SleepSession[]): DailySummary {
  const mainSessions = sessions.filter((session) => session.day === day && session.sleepType === 'main');
  const goal = { minutes: null, revision: 0, effectiveDay: null, verified: false } as const;
  if (mainSessions.length > 1) return { day, status: 'unverified', minutes: null, goal, progress: null };
  if (mainSessions.length === 0) return { day, status: 'no-data', minutes: null, goal, progress: null };
  return { day, status: 'recorded', minutes: mainSessions[0].minutes, goal, progress: null };
}

export class HttpSleepRepository implements SleepRepository {
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly request: Requester = apiRequest,
    private readonly timeoutMs = requestDeadlineMs,
  ) {}

  private async send<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<T>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new ApiError(0, 'NETWORK_ERROR', 'Sleep service did not respond in time.'));
      }, this.timeoutMs);
    });
    try {
      return await Promise.race([
        this.request<T>(path, { ...init, signal: controller.signal }, true),
        timeout,
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  getContext(): SleepContext {
    return { today: dayInZone(new Date(), reportingZone), timeZone: reportingZone };
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async getJournal(query: JournalQuery = {}): Promise<ReadResult<JournalPage>> {
    if (query.sourceIds?.length) {
      return { kind: 'error', message: 'Source-record filtering is not available from the Sleep Journal service.' };
    }
    try {
      const params = new URLSearchParams();
      if (query.from) params.set('from', query.from);
      if (query.to) params.set('to', query.to);
      const suffix = params.size ? `?${params.toString()}` : '';
      const page = await this.send<{ sessions: ApiSession[] }>(`${apiBase}/sessions${suffix}`);
      if (!page || !Array.isArray(page.sessions)) throw new Error('Sleep service returned an invalid Journal.');
      return {
        kind: 'ready',
        data: { sessions: page.sessions.map(mapSession), verified: true, nextCursor: null, version: 'server' },
      };
    } catch (error) {
      return {
        kind: 'error', message: errorMessage(error),
        ...(error instanceof ApiError ? { code: error.code } : {}),
      };
    }
  }

  async getSession(id: string): Promise<ReadResult<SleepSession | null>> {
    try {
      return { kind: 'ready', data: mapSession(await this.send<ApiSession>(`${apiBase}/sessions/${encodeURIComponent(id)}`)) };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404 && error.code === 'SLEEP_NOT_FOUND') {
        return { kind: 'ready', data: null };
      }
      return {
        kind: 'error', message: errorMessage(error),
        ...(error instanceof ApiError ? { code: error.code } : {}),
      };
    }
  }

  async getRecent(): Promise<ReadResult<RecentSleepReport>> {
    try {
      return { kind: 'ready', data: mapRecentSleepReport(await this.send<unknown>('/sleep/recent', { method: 'GET' })) };
    } catch (error) {
      return {
        kind: 'error', message: errorMessage(error),
        ...(error instanceof ApiError ? { code: error.code } : {}),
      };
    }
  }

  async getAllInsights(): Promise<ReadResult<SleepInsightList>> {
    try {
      return { kind: 'ready', data: mapSleepInsightList(await this.send<unknown>('/sleep/insights', { method: 'GET' })) };
    } catch (error) {
      return { kind: 'error', message: errorMessage(error), ...(error instanceof ApiError ? { code: error.code } : {}) };
    }
  }

  async getInsightDetail(code: 'A01' | 'B01'): Promise<ReadResult<SleepInsightDetail>> {
    try {
      return { kind: 'ready', data: mapSleepInsightDetail(
        await this.send<unknown>(`/sleep/insights/${encodeURIComponent(code)}`, { method: 'GET' }), code,
      ) };
    } catch (error) {
      return { kind: 'error', message: errorMessage(error), ...(error instanceof ApiError ? { code: error.code } : {}) };
    }
  }

  async getHome(): Promise<ReadResult<HomeSummary>> {
    const journal = await this.getJournal();
    if (journal.kind === 'error') return journal;
    const today = this.getContext().today;
    const daily = dailySummary(today, journal.data.sessions);
    const mainSessions = journal.data.sessions.filter((session) => session.sleepType === 'main');
    const latestDay = mainSessions.reduce<string | null>((latest, session) => !latest || session.day > latest ? session.day : latest, null);
    const latestForDay = latestDay ? mainSessions.filter((session) => session.day === latestDay) : [];
    const latest = latestForDay.length === 1 ? latestForDay[0] : null;
    return { kind: 'ready', data: { latest, daily, featured: null } };
  }

  async getDaily(day: Day): Promise<ReadResult<DailySummary>> {
    if (day > this.getContext().today) {
      return { kind: 'ready', data: { day, status: 'future', minutes: null,
        goal: { minutes: null, revision: 0, effectiveDay: null, verified: false }, progress: null } };
    }
    const journal = await this.getJournal({ from: day, to: day });
    if (journal.kind === 'error') return journal;
    if (!journal.data.verified) return { kind: 'ready', data: { ...dailySummary(day, []), status: 'unverified' } };
    return { kind: 'ready', data: dailySummary(day, journal.data.sessions) };
  }
  async getGoal(_day?: Day): Promise<ReadResult<GoalState>> { return unavailable('Sleep Goals'); }
  async getWeekly(_query: AnalyticsQuery): Promise<ReadResult<WeeklySummary>> { return unavailable('Weekly analytics'); }
  async getInsights(_query: AnalyticsQuery): Promise<ReadResult<InsightList>> { return unavailable('Sleep Insights'); }
  async getInsight(_key: InsightKey): Promise<ReadResult<Insight | null>> { return unavailable('Sleep Insights'); }
  async getAiConsent(): Promise<ReadResult<AiConsent>> {
    try {
      const value = await this.send<unknown>('/sleep/ai/consent', { method: 'GET' });
      return { kind: 'ready', data: readAiConsent(value) };
    } catch (error) {
      return { kind: 'error', message: errorMessage(error), ...(error instanceof ApiError ? { code: error.code } : {}) };
    }
  }
  async getAi(_request: AiRequest): Promise<ReadResult<AiResponse>> { return unavailable('Sleep AI explanations'); }

  async getRecentStory(): Promise<ReadResult<RecentStory>> {
    try {
      const value = await this.send<unknown>('/sleep/recent/story', { method: 'GET' });
      if (!value || typeof value !== 'object') throw new Error('Sleep service returned an invalid Recent Story.');
      const story = value as RecentStory;
      if (story.status === 'DISABLED' || story.status === 'CONSENT_REQUIRED' || story.status === 'INELIGIBLE') {
        return { kind: 'ready', data: { status: story.status } };
      }
      const { headline, observations } = story;
      if ((story.status !== 'STORY' && story.status !== 'FALLBACK')
        || typeof headline !== 'string' || !headline.trim()
        || !Array.isArray(observations) || observations.length === 0 || observations.length > 2
        || observations.some((observation) => !observation
          || !['A01', 'B01'].includes(observation.insightCode)
          || [observation.text, observation.dataContext, observation.evidenceFingerprint]
            .some((field) => typeof field !== 'string' || !field.trim()))
        || !observations.some(({ insightCode }) => insightCode === 'B01')
        || new Set(observations.map(({ insightCode }) => insightCode)).size !== observations.length) {
        throw new Error('Sleep service returned an invalid Recent Story.');
      }
      return { kind: 'ready', data: story };
    } catch (error) {
      return { kind: 'error', message: errorMessage(error), ...(error instanceof ApiError ? { code: error.code } : {}) };
    }
  }

  async mutate(_attemptId: string, mutation: Mutation): Promise<WriteResult> {
    if (mutation.kind === 'set-goal' || mutation.kind === 'remove-goal') {
      return { kind: 'rejected', message: 'This operation is not available from the Sleep Journal service.' };
    }
    if (mutation.kind === 'set-ai-consent') {
      try {
        const response = await this.send<unknown>('/sleep/ai/consent', {
          method: 'PUT', headers: new Headers({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ enabled: mutation.enabled }),
        });
        const confirmed = readAiConsent(response);
        if (confirmed.enabled !== mutation.enabled || (confirmed.enabled && !confirmed.available)) {
          throw new Error('Sleep service could not confirm the AI consent change.');
        }
        return { kind: 'confirmed', version: 'server' };
      } catch (error) {
        return { kind: 'rejected', message: errorMessage(error) };
      }
    }
    let method: 'POST' | 'PUT' | 'DELETE';
    let path: string;
    let body: string | undefined;
    if (mutation.kind === 'delete-session') {
      method = 'DELETE';
      path = `${apiBase}/sessions/${encodeURIComponent(mutation.id)}`;
    } else {
      const validated = validateSession(mutation.draft, this.getContext(), new Date());
      if (validated.kind === 'validation') return validated;
      body = JSON.stringify(toApiWrite(validated));
      if (mutation.kind === 'create-session') {
        method = 'POST';
        path = `${apiBase}/sessions`;
      } else {
        method = 'PUT';
        path = `${apiBase}/sessions/${encodeURIComponent(mutation.id)}`;
      }
    }

    try {
      if (method === 'DELETE') {
        await this.send<void>(path, { method, ...(mutation.kind === 'delete-session' && mutation.confirmedAt
          ? { headers: new Headers({ 'If-Match': `"${mutation.confirmedAt}"` }) } : {}) });
        for (const listener of this.listeners) listener();
        return { kind: 'confirmed', version: 'server', recordId: mutation.kind === 'delete-session' ? mutation.id : undefined };
      }
      const headers = new Headers({ 'Content-Type': 'application/json' });
      if (mutation.kind === 'update-session' && mutation.confirmedAt) headers.set('If-Match', `"${mutation.confirmedAt}"`);
      const response = await this.send<ApiSession>(path, {
        method, headers, body,
      });
      const session = mapSession(response);
      for (const listener of this.listeners) listener();
      return { kind: 'confirmed', version: session.confirmedAt, recordId: session.id, revision: session.revision };
    } catch (error) {
      if (error instanceof ApiError && (error.status === 409 || error.status === 412
        || (error.status === 404 && error.code === 'SLEEP_NOT_FOUND'))) {
        const reason = error.code === 'SLEEP_OVERLAP' ? 'overlap'
          : error.code === 'SLEEP_NOT_FOUND' ? 'deleted'
          : error.code === 'SLEEP_DAY_ALREADY_RECORDED' ? 'duplicate'
          : error.code === 'SLEEP_WEEK_LOCKED' ? 'week-locked'
          : error.code === 'SLEEP_RECORD_NOT_LATEST' ? 'not-latest' : 'stale';
        return { kind: 'conflict', reason, message: error.message };
      }
      if (error instanceof ApiError && (error.status === 400 || error.status === 422)) {
        return { kind: 'validation', field: error.field ?? 'session', message: error.message };
      }
      if (error instanceof ApiError && (error.status === 0 || error.status >= 500)) {
        return { kind: 'rejected', message: 'Could not confirm the change. Reload your journal before trying again.' };
      }
      return { kind: 'rejected', message: errorMessage(error) };
    }
  }

  async reconcile(_attemptId: string): Promise<WriteResult> {
    return { kind: 'rejected', message: 'Operation reconciliation is not supported by the Sleep Journal service.' };
  }
}
