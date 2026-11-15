import { ApiError, apiRequest } from '../../../lib/api/http-client';
import { dayInZone, shiftDay } from '../utils/sleep-date';
import { readSleepDetailVisual } from '../utils/sleep-detail-evidence';
import { validateGoal, validateSession } from '../utils/sleep-validation';
import type { SleepRepository } from './sleep-repository';
import type {
  AiRequest, AiResponse, AnalyticsQuery, DailySummary, Day, Feeling, GoalState, HomeSummary, Insight,
  InsightKey, InsightList, JournalPage, JournalQuery, Mutation, ReadResult, SleepContext, SleepSession,
  RecentSleepDay, RecentSleepHighlight, RecentSleepInsight, RecentSleepReport, WeeklySummary, WriteResult,
  CatalogSleepInsightCode, SleepInsightDetail, SleepInsightItem, SleepInsightList, SleepInsightPeriod, SleepInsightStatus,
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

function mapGoalState(value: unknown, requestedDay?: Day): GoalState {
  if (!value || typeof value !== 'object') throw new Error('Sleep service returned an invalid Goal history.');
  const goal = value as Record<string, unknown>;
  if (goal.verified !== true || !Number.isSafeInteger(goal.revision) || (goal.revision as number) < 0
    || (goal.minutes !== null && (!Number.isInteger(goal.minutes) || (goal.minutes as number) < 60
      || (goal.minutes as number) > 1440 || (goal.minutes as number) % 15 !== 0))
    || (goal.effectiveDay !== null && (!isCivilDay(goal.effectiveDay)
      || (requestedDay !== undefined && goal.effectiveDay > requestedDay)))
    || (goal.minutes !== null && goal.effectiveDay === null)) {
    throw new Error('Sleep service returned an invalid Goal history.');
  }
  return {
    minutes: goal.minutes as number | null,
    revision: goal.revision as number,
    effectiveDay: goal.effectiveDay as Day | null,
    verified: true,
  };
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

function mapInsightItem(value: unknown, period: SleepInsightPeriod): SleepInsightItem {
  if (!value || typeof value !== 'object') throw new Error('Sleep service returned an invalid Insight.');
  const item = value as Record<string, unknown>;
  const category = item.category;
  const code = item.code;
  if (!isCatalogInsightCode(code) || category !== insightCategory(code)
    || !insightStatuses.includes(item.status as SleepInsightStatus) || typeof item.title !== 'string' || !item.title
    || typeof item.locked !== 'boolean') {
    throw new Error('Sleep service returned an invalid Insight.');
  }
  const status = item.status as SleepInsightStatus;
  if ((status === 'READY' && item.locked) || (status !== 'READY' && !item.locked)) {
    throw new Error('Sleep service returned an invalid Insight publication state.');
  }
  if (status === 'READY') {
    if (code === 'A03' || code === 'B03') {
      const completedPeriod = {
        start: shiftDay(period.start, -1), end: shiftDay(period.end, -1), timeZone: period.timeZone,
      };
      if (!readSleepDetailVisual({ code, status, period: completedPeriod, sample: item.sample, evidence: item.evidence })) {
        throw new Error('Sleep service returned invalid Trend insight evidence.');
      }
    } else if ((code === 'A02' || code === 'B04') && !validGoalInsightDetail(code, item.sample, item.evidence, period)) {
      throw new Error('Sleep service returned invalid Goal insight evidence.');
    } else if ((code === 'A04' || code === 'A05' || code === 'B02')
      && !readSleepDetailVisual({ code, status, period, sample: item.sample, evidence: item.evidence })) {
      throw new Error('Sleep service returned invalid catalog insight evidence.');
    }
  }
  if (item.summary !== undefined && typeof item.summary !== 'string') throw new Error('Sleep service returned an invalid Insight summary.');
  return item as unknown as SleepInsightItem;
}

export function mapSleepInsightList(value: unknown): SleepInsightList {
  if (!value || typeof value !== 'object') throw new Error('Sleep service returned an invalid Insights list.');
  const response = value as Record<string, unknown>;
  if (!Array.isArray(response.items)) throw new Error('Sleep service returned an invalid Insights list.');
  const period = mapInsightPeriod(response.period);
  const timeZones = response.timeZones ?? [];
  if (!Array.isArray(timeZones) || timeZones.some((zone) => typeof zone !== 'string' || !zone)
    || new Set(timeZones).size !== timeZones.length) throw new Error('Sleep service returned invalid reference time zones.');
  return { period, items: response.items.map((item) => mapInsightItem(item, period)), timeZones: timeZones as string[] };
}

export function mapSleepInsightDetail(value: unknown, expectedCode: CatalogSleepInsightCode): SleepInsightDetail {
  if (!value || typeof value !== 'object') throw new Error('Sleep service returned an invalid Insight detail.');
  const detail = value as Record<string, unknown>;
  const code = detail.code;
  if (code !== expectedCode || detail.category !== insightCategory(expectedCode)
    || !insightStatuses.includes(detail.status as SleepInsightStatus) || typeof detail.title !== 'string' || !detail.title
    || detail.sourceRefs === undefined || detail.limitations === undefined
    || typeof detail.policyVersion !== 'string' || typeof detail.evidenceVersion !== 'string'
    || (detail.summary !== undefined && typeof detail.summary !== 'string')) {
    throw new Error('Sleep service returned an invalid Insight detail.');
  }
  const period = mapInsightPeriod(detail.period);
  if (detail.status === 'READY') {
    if (expectedCode === 'A03' || expectedCode === 'B03') {
      if (!readSleepDetailVisual({ ...detail, period })) {
        throw new Error('Sleep service returned invalid Trend insight evidence.');
      }
    } else if ((expectedCode === 'A02' || expectedCode === 'B04')
      && !validGoalInsightDetail(expectedCode, detail.sample, detail.evidence, period)) {
      throw new Error('Sleep service returned invalid Goal insight evidence.');
    } else if ((expectedCode === 'A04' || expectedCode === 'A05' || expectedCode === 'B02')
      && !readSleepDetailVisual({ ...detail, period })) {
      throw new Error('Sleep service returned invalid catalog insight evidence.');
    }
  }
  return { ...detail, period } as unknown as SleepInsightDetail;
}

function isCatalogInsightCode(value: unknown): value is CatalogSleepInsightCode {
  return value === 'A01' || value === 'A02' || value === 'A03' || value === 'A04' || value === 'A05'
    || value === 'B01' || value === 'B02' || value === 'B03' || value === 'B04';
}

function insightCategory(code: CatalogSleepInsightCode): 'A' | 'B' {
  return code.startsWith('A') ? 'A' : 'B';
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function validGoalInsightDetail(
  code: CatalogSleepInsightCode, sample: unknown, evidence: unknown, period: SleepInsightPeriod,
): boolean {
  if (!sample || typeof sample !== 'object' || Array.isArray(sample)
    || !evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return code !== 'A02' && code !== 'B04';
  const sampleValues = sample as Record<string, unknown>;
  const evidenceValues = evidence as Record<string, unknown>;
  if (code === 'A02') {
    return isNonNegativeInteger(sampleValues.eligibleMainDays) && sampleValues.eligibleMainDays >= 3
      && isNonNegativeInteger(evidenceValues.metGoalDays)
      && evidenceValues.metGoalDays <= sampleValues.eligibleMainDays
      && evidenceValues.eligibleMainDays === sampleValues.eligibleMainDays;
  }
  if (code === 'B04') {
    return isNonNegativeInteger(sampleValues.ratedMain)
      && sampleValues.ratedMain >= 3
      && isNonNegativeInteger(sampleValues.comparableRatedMain)
      && sampleValues.comparableRatedMain <= sampleValues.ratedMain
      && isNonNegativeInteger(evidenceValues.exceptionCount)
      && evidenceValues.exceptionCount >= 1
      && isNonNegativeInteger(evidenceValues.ratedMain)
      && evidenceValues.ratedMain === sampleValues.ratedMain
      && Array.isArray(evidenceValues.exceptions)
      && evidenceValues.exceptions.length === evidenceValues.exceptionCount
      && evidenceValues.exceptionCount <= sampleValues.comparableRatedMain
      && evidenceValues.exceptions.every((value) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
        const row = value as Record<string, unknown>;
        return isCivilDay(row.day) && row.day >= period.start && row.day <= period.end
          && Number.isInteger(row.minutes) && Number(row.minutes) >= 1
          && Number(row.minutes) <= 1440 && Number.isInteger(row.goalMinutes)
          && Number(row.goalMinutes) >= 60 && Number(row.goalMinutes) <= 1440
          && Number(row.goalMinutes) % 15 === 0 && Number(row.minutes) >= Number(row.goalMinutes);
      });
  }
  return true;
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
      if (!isCatalogInsightCode(item.code) || item.status !== 'READY'
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
  private referenceTimeZone: string | null = null;

  constructor(
    private readonly request: Requester = apiRequest,
    private readonly timeoutMs = requestDeadlineMs,
  ) {}

  getReferenceTimeZone(): string | null { return this.referenceTimeZone; }

  setReferenceTimeZone(timeZone: string | null): void {
    if (this.referenceTimeZone === timeZone) return;
    this.referenceTimeZone = timeZone;
    this.listeners.forEach((listener) => listener());
  }

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
      const query = new URLSearchParams({ catalog: 'full' });
      if (this.referenceTimeZone) query.set('timeZone', this.referenceTimeZone);
      let value: unknown;
      try {
        value = await this.send<unknown>(`/sleep/recent?${query}`, { method: 'GET' });
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 400 || error.code !== 'INVALID_REQUEST') throw error;
        value = await this.send<unknown>('/sleep/recent', { method: 'GET' });
      }
      return { kind: 'ready', data: mapRecentSleepReport(value) };
    } catch (error) {
      return {
        kind: 'error', message: errorMessage(error),
        ...(error instanceof ApiError ? { code: error.code } : {}),
      };
    }
  }

  async getAllInsights(): Promise<ReadResult<SleepInsightList>> {
    try {
      const query = new URLSearchParams({ catalog: 'full' });
      if (this.referenceTimeZone) query.set('timeZone', this.referenceTimeZone);
      let response: unknown;
      try {
        response = await this.send<unknown>(`/sleep/insights?${query}`, { method: 'GET' });
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 400 || error.code !== 'INVALID_REQUEST') throw error;
        try {
          response = await this.send<unknown>('/sleep/insights?catalog=trend', { method: 'GET' });
        } catch (trendError) {
          if (!(trendError instanceof ApiError) || trendError.status !== 400 || trendError.code !== 'INVALID_REQUEST') throw trendError;
          response = await this.send<unknown>('/sleep/insights?catalog=goal', { method: 'GET' });
        }
      }
      return { kind: 'ready', data: mapSleepInsightList(response) };
    } catch (error) {
      return { kind: 'error', message: errorMessage(error), ...(error instanceof ApiError ? { code: error.code } : {}) };
    }
  }

  async getInsightDetail(code: CatalogSleepInsightCode): Promise<ReadResult<SleepInsightDetail>> {
    try {
      const query = code === 'A04' && this.referenceTimeZone
        ? `?timeZone=${encodeURIComponent(this.referenceTimeZone)}` : '';
      return { kind: 'ready', data: mapSleepInsightDetail(
        await this.send<unknown>(`/sleep/insights/${encodeURIComponent(code)}${query}`, { method: 'GET' }), code,
      ) };
    } catch (error) {
      return { kind: 'error', message: errorMessage(error), ...(error instanceof ApiError ? { code: error.code } : {}) };
    }
  }

  async getHome(): Promise<ReadResult<HomeSummary>> {
    const journal = await this.getJournal();
    if (journal.kind === 'error') return journal;
    const today = this.getContext().today;
    const [goal, recent] = await Promise.all([this.getGoal(), this.getRecent()]);
    const daily = dailySummary(today, journal.data.sessions);
    daily.goal = goal.kind === 'ready' ? goal.data
      : { minutes: null, revision: 0, effectiveDay: null, verified: false };
    const mainSessions = journal.data.sessions.filter((session) => session.sleepType === 'main');
    const latestDay = mainSessions.reduce<string | null>((latest, session) => !latest || session.day > latest ? session.day : latest, null);
    const latestForDay = latestDay ? mainSessions.filter((session) => session.day === latestDay) : [];
    const latest = latestForDay.length === 1 ? latestForDay[0] : null;
    const currentDay = this.getContext().today;
    const currentReport = recent.kind === 'ready' && recent.data.dataStatus === 'verified'
      && recent.data.period.end === currentDay;
    const highlight = currentReport ? recent.data.highlights?.[0] : undefined;
    const featured = highlight
      ? { source: 'recent' as const, code: highlight.code, title: highlight.title, summary: highlight.summary }
      : null;
    return { kind: 'ready', data: { latest, daily, featured } };
  }

  async getDaily(day: Day): Promise<ReadResult<DailySummary>> {
    if (day > this.getContext().today) {
      return { kind: 'ready', data: { day, status: 'future', minutes: null,
        goal: { minutes: null, revision: 0, effectiveDay: null, verified: false }, progress: null } };
    }
    const journal = await this.getJournal({ from: day, to: day });
    if (journal.kind === 'error') return journal;
    const goal = await this.getGoal(day);
    const daily = !journal.data.verified
      ? { ...dailySummary(day, []), status: 'unverified' as const }
      : dailySummary(day, journal.data.sessions);
    daily.goal = goal.kind === 'ready' ? goal.data
      : { minutes: null, revision: 0, effectiveDay: null, verified: false };
    return { kind: 'ready', data: daily };
  }
  async getGoal(day?: Day): Promise<ReadResult<GoalState>> {
    const requestedDay = day ?? this.getContext().today;
    if (!isCivilDay(requestedDay) || requestedDay > this.getContext().today) {
      return { kind: 'error', message: 'Choose a valid Sleep Goal day.' };
    }
    try {
      const path = day === undefined ? '/sleep/goal' : `/sleep/goal?day=${encodeURIComponent(day)}`;
      const value = await this.send<unknown>(path, { method: 'GET' });
      return { kind: 'ready', data: mapGoalState(value, day) };
    } catch (error) {
      return { kind: 'error', message: errorMessage(error), ...(error instanceof ApiError ? { code: error.code } : {}) };
    }
  }
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
  async getAi(request: AiRequest): Promise<ReadResult<AiResponse>> {
    try {
      if (request.kind !== 'explanation') return unavailable('Sleep AI story');
      const value = await this.send<unknown>('/sleep/ai/explanations', {
        method: 'POST', headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ insightCode: request.insight.code, evidenceVersion: request.insight.version }),
      });
      if (!value || typeof value !== 'object') throw new Error('Sleep service returned an invalid AI explanation.');
      const result = value as Record<string, unknown>;
      if (result.status === 'CONSENT_REQUIRED' || result.status === 'INELIGIBLE' || result.status === 'DISABLED' || result.status === 'STALE') {
        const status = result.status === 'CONSENT_REQUIRED' ? 'consent-required'
          : result.status === 'INELIGIBLE' ? 'ineligible' : result.status === 'STALE' ? 'stale' : 'unavailable';
        return { kind: 'ready', data: { status } };
      }
      if ((result.status !== 'EXPLANATION' && result.status !== 'FALLBACK')
        || [result.observation, result.evidenceBasis, result.limitations, result.evidenceFingerprint]
          .some((field) => typeof field !== 'string' || !field.trim())) {
        throw new Error('Sleep service returned an invalid AI explanation.');
      }
      return { kind: 'ready', data: {
        status: result.status === 'EXPLANATION' ? 'explanation' : 'fallback',
        observation: result.observation as string, evidenceBasis: result.evidenceBasis as string,
        limitations: result.limitations as string, evidenceFingerprint: result.evidenceFingerprint as string,
      } };
    } catch (error) {
      return { kind: 'error', message: errorMessage(error), ...(error instanceof ApiError ? { code: error.code } : {}) };
    }
  }

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
      if (!Number.isSafeInteger(mutation.revision) || mutation.revision < 0) {
        return { kind: 'validation', field: 'revision', message: 'Reload the confirmed Sleep Goal before changing it.' };
      }
      const goal = mutation.kind === 'set-goal' ? validateGoal(mutation.hours, mutation.minutes) : undefined;
      if (goal?.kind === 'validation') return goal;
      try {
        const result = mutation.kind === 'set-goal'
          ? await this.send<unknown>('/sleep/goal', {
            method: 'PUT', headers: new Headers({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ minutes: goal?.minutes, revision: mutation.revision }),
          })
          : await this.send<unknown>(`/sleep/goal?revision=${mutation.revision}`, { method: 'DELETE' });
        const confirmed = mapGoalState(result);
        if ((mutation.kind === 'set-goal' && confirmed.minutes !== goal?.minutes)
          || (mutation.kind === 'remove-goal' && confirmed.minutes !== null)
          || confirmed.effectiveDay === null || confirmed.revision !== mutation.revision + 1) {
          throw new Error('Sleep service could not confirm the Sleep Goal change.');
        }
        for (const listener of this.listeners) listener();
        return { kind: 'confirmed', version: String(confirmed.revision), effectiveDay: confirmed.effectiveDay ?? undefined };
      } catch (error) {
        if (error instanceof ApiError && (error.status === 409 || error.status === 412)) {
          return { kind: 'conflict', reason: 'stale', message: error.message };
        }
        if (error instanceof ApiError && (error.status === 400 || error.status === 422)) {
          return { kind: 'validation', field: error.field ?? 'goal', message: error.message };
        }
        if (error instanceof ApiError && (error.status === 0 || error.status >= 500)) {
          return { kind: 'rejected', message: 'Could not confirm the change. Reload your goal before trying again.' };
        }
        return { kind: 'rejected', message: errorMessage(error) };
      }
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
