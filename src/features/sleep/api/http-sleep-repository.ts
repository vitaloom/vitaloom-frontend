import { ApiError, apiRequest } from '../../../lib/api/http-client';
import { dayInZone } from '../utils/sleep-date';
import { validateSession } from '../utils/sleep-validation';
import type { SleepRepository } from './sleep-repository';
import type {
  AiRequest, AiResponse, AnalyticsQuery, DailySummary, Day, Feeling, GoalState, HomeSummary, Insight,
  InsightKey, InsightList, JournalPage, JournalQuery, Mutation, ReadResult, SleepContext, SleepSession,
  WeeklySummary, WriteResult,
} from '../types/sleep';

const apiBase = '/sleep/v2';
const reportingZone = 'Asia/Ho_Chi_Minh';
const requestDeadlineMs = 15_000;

type Requester = <T>(path: string, init?: RequestInit, authenticated?: boolean) => Promise<T>;
type ApiCivilTime = { day: string; hour: string; minute: string; offsetMinutes?: number | null };
type ApiSession = {
  id: string;
  confirmedAt: string;
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
    id: value.id, revision: 1, confirmedAt: value.confirmedAt, sleepType, feeling,
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
    sleepType: session.sleepType.toUpperCase(),
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

  async getHome(): Promise<ReadResult<HomeSummary>> {
    const journal = await this.getJournal();
    if (journal.kind === 'error') return journal;
    const today = this.getContext().today;
    const daily: DailySummary = {
      day: today, status: 'unverified', minutes: null,
      goal: { minutes: null, revision: 0, effectiveDay: null, verified: false }, progress: null,
    };
    return { kind: 'ready', data: { latest: journal.data.sessions[0] ?? null, daily, featured: null } };
  }

  async getDaily(_day: Day): Promise<ReadResult<DailySummary>> { return unavailable('Daily totals'); }
  async getGoal(_day?: Day): Promise<ReadResult<GoalState>> { return unavailable('Sleep Goals'); }
  async getWeekly(_query: AnalyticsQuery): Promise<ReadResult<WeeklySummary>> { return unavailable('Weekly analytics'); }
  async getInsights(_query: AnalyticsQuery): Promise<ReadResult<InsightList>> { return unavailable('Sleep Insights'); }
  async getInsight(_key: InsightKey): Promise<ReadResult<Insight | null>> { return unavailable('Sleep Insights'); }
  async getAiConsent(): Promise<ReadResult<boolean>> { return unavailable('AI consent'); }
  async getAi(_request: AiRequest): Promise<ReadResult<AiResponse>> { return unavailable('Sleep AI'); }

  async mutate(_attemptId: string, mutation: Mutation): Promise<WriteResult> {
    if (mutation.kind === 'set-goal' || mutation.kind === 'remove-goal' || mutation.kind === 'set-ai-consent') {
      return { kind: 'rejected', message: 'This operation is not available from the Sleep Journal service.' };
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
        await this.send<void>(path, { method });
        for (const listener of this.listeners) listener();
        return { kind: 'confirmed', version: 'server', recordId: mutation.kind === 'delete-session' ? mutation.id : undefined };
      }
      const headers = new Headers({ 'Content-Type': 'application/json' });
      const response = await this.send<ApiSession>(path, {
        method, headers, body,
      });
      const session = mapSession(response);
      for (const listener of this.listeners) listener();
      return { kind: 'confirmed', version: session.confirmedAt, recordId: session.id, revision: session.revision };
    } catch (error) {
      if (error instanceof ApiError && (error.status === 409 || error.status === 412
        || (error.status === 404 && error.code === 'SLEEP_NOT_FOUND'))) {
        const reason = error.code === 'SLEEP_OVERLAP' ? 'overlap' : error.code === 'SLEEP_NOT_FOUND' ? 'deleted' : 'stale';
        return { kind: 'conflict', reason, message: error.message };
      }
      if (error instanceof ApiError && (error.status === 400 || error.status === 422)) {
        return { kind: 'validation', field: error.field ?? 'session', message: error.message };
      }
      return { kind: 'rejected', message: errorMessage(error) };
    }
  }

  async reconcile(_attemptId: string): Promise<WriteResult> {
    return { kind: 'rejected', message: 'Operation reconciliation is not supported by the Sleep Journal service.' };
  }
}
