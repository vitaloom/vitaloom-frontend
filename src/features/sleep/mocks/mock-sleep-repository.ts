import type {
  AiRequest, AnalyticsQuery, GoalEntry, Insight, InsightKey, JournalPage, JournalQuery, Mutation,
  ReadResult, SleepContext, SleepSession, WriteResult,
} from '../types/sleep';
import type { SleepRepository } from '../api/sleep-repository';
import { aiFixture, dailySummary, featuredInsight, insightList, type AnalyticsState, weeklySummary } from './sleep-analytics';
import { civilInZone, dayInZone, resolveCivil, shiftDay, startOfWeek } from '../utils/sleep-date';
import { validateGoal, validateSession } from '../utils/sleep-validation';

export type SleepScenario = 'populated' | 'empty' | 'no-goal' | 'insufficient' | 'unverified' | 'stale' | 'ai-unavailable' | 'network-error';
export type SleepMockFault = 'reject' | 'unknown-after' | 'unknown-before' | 'conflict' | 'stale' | 'deleted';
type SleepReadFault = 'read-error';

type MockOptions = { today?: string; timeZone?: string; scenario?: SleepScenario };
type PendingWrite = { signature: string; result: WriteResult; resolve: () => WriteResult };

export class MockSleepRepository implements SleepRepository {
  private sessions: SleepSession[];
  private goals: GoalEntry[];
  private revision: number;
  private versionNumber = 1;
  private confirmedCounter: number;
  private consent = false;
  private listeners = new Set<() => void>();
  private receipts = new Map<string, PendingWrite>();
  private nextFault: SleepMockFault | null = null;
  private readFault: SleepReadFault | null = null;
  private busy = false;
  private readonly scenario: SleepScenario;
  private readonly context: SleepContext;
  private readonly fixedToday?: string;

  constructor(private readonly accountKey: string, options: MockOptions = {}) {
    this.scenario = options.scenario ?? 'populated';
    this.fixedToday = options.today;
    this.context = {
      today: options.today ?? dayInZone(new Date(), options.timeZone ?? 'Asia/Ho_Chi_Minh'),
      timeZone: options.timeZone ?? 'Asia/Ho_Chi_Minh',
    };
    this.sessions = this.scenario === 'empty' ? [] : makeFixture(this.context.today, this.context.timeZone);
    if (this.scenario === 'insufficient') this.sessions = this.sessions.filter((session) => session.id === 'fixture-duration');
    this.goals = this.scenario === 'no-goal' || this.scenario === 'empty' ? [] : [{ effectiveDay: shiftDay(this.context.today, -45), minutes: 480 }];
    this.revision = this.sessions.length;
    this.confirmedCounter = this.sessions.length;
    if (this.scenario === 'unverified') this.readFault = 'read-error';
  }

  getContext(): SleepContext {
    return { ...this.context, today: this.fixedToday ?? dayInZone(new Date(), this.context.timeZone) };
  }
  subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  setNextFault(fault: SleepMockFault): void { this.nextFault = fault; }
  failNextRead(): void { this.readFault = 'read-error'; }
  get snapshotForAnalytics(): AnalyticsState { return this.analyticsState(); }

  async getHome() {
    const state = this.analyticsState();
    const loaded = this.read(state);
    if (loaded.kind === 'error') return loaded;
    const latest = [...this.sessions].sort((a, b) => b.day.localeCompare(a.day)
      || b.confirmedAt.localeCompare(a.confirmedAt) || b.id.localeCompare(a.id))[0] ?? null;
    return { kind: 'ready' as const, data: { latest: latest && copySession(latest), daily: dailySummary(state, this.getContext().today), featured: featuredInsight(state) } };
  }

  async getDaily(day: string) {
    const state = this.analyticsState();
    return this.read(dailySummary(state, day));
  }

  async getJournal(query: JournalQuery = {}): Promise<ReadResult<JournalPage>> {
    const fault = this.takeReadFault();
    if (fault) return { kind: 'error' as const, message: 'Sleep history could not be verified. Try again.' };
    const sessions = [...this.sessions].filter((session) =>
      (!query.from || session.day >= query.from) && (!query.to || session.day <= query.to)
      && (!query.sourceIds || query.sourceIds.includes(session.id)))
      .sort((a, b) => b.day.localeCompare(a.day)
        || b.confirmedAt.localeCompare(a.confirmedAt) || a.id.localeCompare(b.id));
    const limit = Math.max(1, Math.min(query.limit ?? 50, 100));
    const filter = JSON.stringify({ from: query.from ?? null, to: query.to ?? null, limit, sourceIds: query.sourceIds ? [...query.sourceIds].sort() : null });
    let offset = 0;
    if (query.cursor) {
      try {
        const cursor = JSON.parse(decodeURIComponent(query.cursor)) as { version?: string; filter?: string; offset?: number };
        if (cursor.version !== this.version() || cursor.filter !== filter) return { kind: 'error', message: 'Journal page is no longer available. Reload the journal.' };
        offset = cursor.offset ?? -1;
      } catch {
        return { kind: 'error', message: 'Journal page is no longer available. Reload the journal.' };
      }
    }
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > sessions.length) return { kind: 'error' as const, message: 'Journal page is no longer available.' };
    const page = sessions.slice(offset, offset + limit);
    const nextOffset = offset + page.length;
    const result: JournalPage = {
      sessions: page.map(copySession), verified: this.scenario !== 'unverified',
      nextCursor: nextOffset < sessions.length ? encodeURIComponent(JSON.stringify({ version: this.version(), filter, offset: nextOffset })) : null,
      version: this.version(),
    };
    return this.read(result);
  }

  async getSession(id: string) {
    const session = this.sessions.find((candidate) => candidate.id === id);
    return this.read(session ? copySession(session) : null);
  }

  async getGoal(day = this.getContext().today) {
    const entry = [...this.goals].reverse().find((candidate) => candidate.effectiveDay <= day);
    return this.read({ minutes: entry?.minutes ?? null, revision: this.revision, effectiveDay: entry?.effectiveDay ?? null, verified: this.scenario !== 'unverified' });
  }

  async getWeekly(query: AnalyticsQuery) {
    if (!this.validQuery(query)) return { kind: 'error' as const, message: 'Choose a Monday on or before the current week.' };
    return this.read(weeklySummary(this.analyticsState(), query));
  }
  async getInsights(query: AnalyticsQuery) {
    if (!this.validQuery(query)) return { kind: 'error' as const, message: 'Choose a Monday on or before the current week.' };
    return this.read(insightList(this.analyticsState(), query));
  }

  async getInsight(key: InsightKey): Promise<ReadResult<Insight | null>> {
    if (!this.validQuery(key)) return { kind: 'error', message: 'Choose a Monday on or before the current week.' };
    const result = insightList(this.analyticsState(), key).items.find((insight) => insight.key.code === key.code);
    if (!result) return this.read(null);
    if (key.version && result.key.version !== key.version) {
      return this.read({ ...result, status: 'stale', eligible: false, summary: 'This evidence changed. Reload to view current results.', sample: '', coverage: '', evidence: [], sourceIds: [] });
    }
    return this.read(copyInsight(result));
  }

  async getAiConsent() { return this.read(this.consent); }

  async getAi(request: AiRequest) {
    const state = this.analyticsState();
    const response = aiFixture(state, request, this.consent, this.scenario === 'ai-unavailable');
    return this.read(response);
  }

  async mutate(attemptId: string, mutation: Mutation): Promise<WriteResult> {
    const capturedMutation = copyValue(mutation);
    const signature = JSON.stringify(capturedMutation);
    const prior = this.receipts.get(attemptId);
    if (prior) return prior.signature === signature ? copyResult(prior.result) : { kind: 'rejected', message: 'This attempt identifier was already used for a different action.' };
    if (!attemptId.trim()) return { kind: 'rejected', message: 'A request identifier is required.' };
    if (this.busy) return { kind: 'rejected', message: 'Another Sleep change is being confirmed.' };
    this.busy = true;
    try {
      const result = this.prepare(capturedMutation);
      if (result.kind !== 'confirmed') {
        this.saveReceipt(attemptId, signature, result, () => result);
        return copyResult(result);
      }
      const fault = this.takeFault();
      if (fault === 'reject') {
        const rejected = { kind: 'rejected' as const, message: 'The Sleep change was declined.' };
        this.saveReceipt(attemptId, signature, rejected, () => rejected);
        return copyResult(rejected);
      }
      if (fault === 'conflict' || fault === 'stale' || fault === 'deleted') {
        const conflict: WriteResult = { kind: 'conflict', reason: fault === 'deleted' ? 'deleted' : 'stale', message: 'Sleep data changed. Reload before trying again.' };
        this.saveReceipt(attemptId, signature, conflict, () => conflict);
        return copyResult(conflict);
      }
      if (fault === 'unknown-before' || fault === 'unknown-after') {
        const resolution = fault === 'unknown-before'
          ? () => ({ kind: 'rejected' as const, message: 'The request was not applied after reconciliation.' })
          : () => {
            const current = this.prepare(capturedMutation);
            return current.kind === 'confirmed' ? this.commitAction(capturedMutation)() : current;
          };
        const unknown: WriteResult = { kind: 'unknown', attemptId };
        this.saveReceipt(attemptId, signature, unknown, resolution);
        return unknown;
      }
      const confirmed = this.commitAction(capturedMutation)();
      this.saveReceipt(attemptId, signature, confirmed, () => confirmed);
      if (confirmed.kind === 'confirmed') this.emit();
      return copyResult(confirmed);
    } finally {
      this.busy = false;
    }
  }

  async reconcile(attemptId: string): Promise<WriteResult> {
    const pending = this.receipts.get(attemptId);
    if (!pending) return { kind: 'unknown', attemptId };
    if (pending.result.kind === 'unknown') {
      const result = pending.resolve();
      pending.result = copyResult(result);
      if (result.kind === 'confirmed') this.emit();
      return copyResult(result);
    }
    return copyResult(pending.result);
  }

  private prepare(mutation: Mutation): WriteResult {
    switch (mutation.kind) {
      case 'create-session':
      case 'update-session': {
        const existing = mutation.kind === 'update-session' ? this.sessions.find(({ id }) => id === mutation.id) : undefined;
        if (mutation.kind === 'update-session' && !existing) return { kind: 'conflict', reason: 'deleted', message: 'This session was deleted. Reload the journal.' };
        if (mutation.kind === 'update-session' && existing && existing.revision !== mutation.revision) return { kind: 'conflict', reason: 'stale', message: 'This session changed. Reload before editing.' };
        const validation = validateSession(mutation.draft, this.getContext(), new Date(), existing);
        if (validation.kind === 'validation') return validation;
        const candidate = validation.value;
        if (candidate.method === 'range' && this.sessions.some((session) => session.id !== existing?.id
          && session.method === 'range' && new Date(candidate.startAt).getTime() < new Date(session.endAt).getTime()
          && new Date(candidate.endAt).getTime() > new Date(session.startAt).getTime())) {
          return { kind: 'conflict', reason: 'overlap', message: 'This time range overlaps a confirmed sleep session.' };
        }
        const session: SleepSession = {
          ...candidate, id: existing?.id ?? `sleep-${this.accountKey}-${this.confirmedCounter + 1}`,
          revision: (existing?.revision ?? 0) + 1, confirmedAt: new Date().toISOString(),
        };
        return { kind: 'confirmed', version: this.version(), recordId: session.id, revision: session.revision };
      }
      case 'delete-session': {
        const existing = this.sessions.find(({ id }) => id === mutation.id);
        if (!existing) return { kind: 'conflict', reason: 'deleted', message: 'This session was already deleted. Reload the journal.' };
        if (existing.revision !== mutation.revision) return { kind: 'conflict', reason: 'stale', message: 'This session changed. Reload the journal.' };
        return { kind: 'confirmed', version: this.version(), recordId: existing.id, revision: existing.revision + 1 };
      }
      case 'set-goal': {
        if (mutation.revision !== this.revision) return { kind: 'conflict', reason: 'stale', message: 'The goal changed. Reload before saving.' };
        const goal = validateGoal(mutation.hours, mutation.minutes);
        return goal.kind === 'valid' ? { kind: 'confirmed', version: this.version(), revision: this.revision + 1, effectiveDay: this.getContext().today } : goal;
      }
      case 'remove-goal':
        return mutation.revision === this.revision
          ? { kind: 'confirmed', version: this.version(), revision: this.revision + 1, effectiveDay: this.getContext().today }
          : { kind: 'conflict', reason: 'stale', message: 'The goal changed. Reload before removing it.' };
      case 'set-ai-consent':
        return { kind: 'confirmed', version: this.version() };
    }
  }

  private commitAction(mutation: Mutation): () => WriteResult {
    if (mutation.kind === 'set-ai-consent') return () => {
      this.consent = mutation.enabled;
      return { kind: 'confirmed', version: this.version() };
    };
    if (mutation.kind === 'set-goal' || mutation.kind === 'remove-goal') return () => {
      const goal = mutation.kind === 'remove-goal' ? null : Number(mutation.hours) * 60 + Number(mutation.minutes);
      const effectiveDay = this.getContext().today;
      this.goals = [...this.goals, { effectiveDay, minutes: goal }];
      this.revision += 1;
      this.bumpVersion();
      return { kind: 'confirmed', version: this.version(), revision: this.revision, effectiveDay };
    };
    if (mutation.kind === 'delete-session') return () => {
      this.sessions = this.sessions.filter(({ id }) => id !== mutation.id);
      this.revision += 1;
      this.bumpVersion();
      return { kind: 'confirmed', version: this.version() };
    };
    return () => {
      const existing = this.sessions.find(({ id }) => id === (mutation.kind === 'update-session' ? mutation.id : ''));
      const validated = validateSession(mutation.draft, this.getContext(), new Date(), existing);
      if (validated.kind !== 'valid') return validated;
      const session: SleepSession = {
        ...validated.value,
        id: existing?.id ?? `sleep-${this.accountKey}-${++this.confirmedCounter}`,
        revision: (existing?.revision ?? 0) + 1,
        confirmedAt: new Date().toISOString(),
      };
      if (existing) this.sessions = this.sessions.map((candidate) => candidate.id === existing.id ? session : candidate);
      else this.sessions = [...this.sessions, session];
      this.revision += 1;
      this.bumpVersion();
      return { kind: 'confirmed', version: this.version(), recordId: session.id, revision: session.revision };
    };
  }

  private analyticsState(): AnalyticsState {
    return {
      sessions: this.sessions.map(copySession), goals: this.goals.map((goal) => ({ ...goal })),
      goalRevision: this.revision, context: this.getContext(), version: this.version(),
      verified: this.scenario !== 'unverified', goalVerified: this.scenario !== 'unverified',
      stale: this.scenario === 'stale',
    };
  }

  private validQuery(query: AnalyticsQuery): boolean {
    try {
      return startOfWeek(query.week) === query.week && query.week <= startOfWeek(this.getContext().today)
        && (!query.timeZone || Boolean(new Intl.DateTimeFormat('en', { timeZone: query.timeZone })));
    } catch {
      return false;
    }
  }

  private read<T>(data: T): ReadResult<T> {
    if (this.takeReadFault()) return { kind: 'error', message: 'Sleep data could not be verified. Try again.' };
    return { kind: 'ready', data: copyValue(data) };
  }
  private takeFault(): SleepMockFault | null { const fault = this.nextFault; this.nextFault = null; return fault; }
  private takeReadFault(): SleepReadFault | null {
    const fault = this.readFault;
    this.readFault = null;
    return this.scenario === 'network-error' ? 'read-error' : fault;
  }
  private saveReceipt(attemptId: string, signature: string, result: WriteResult, resolve: () => WriteResult): void {
    this.receipts.set(attemptId, { signature, result: copyResult(result), resolve });
  }
  private version(): string { return `sleep-${this.accountKey}-v${this.versionNumber}`; }
  private bumpVersion(): void { this.versionNumber += 1; }
  private emit(): void { for (const listener of this.listeners) listener(); }
}

function copySession(session: SleepSession): SleepSession {
  return session.method === 'range' ? { ...session, start: { ...session.start }, end: { ...session.end } } : { ...session };
}
function copyInsight(insight: Insight): Insight {
  return { ...insight, key: { ...insight.key }, period: { ...insight.period }, evidence: insight.evidence.map((item) => ({ ...item })), sourceIds: [...insight.sourceIds], limitations: [...insight.limitations] };
}
function copyResult(result: WriteResult): WriteResult { return { ...result }; }
function copyValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map(copyValue) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, copyValue(child)])) as T;
  }
  return value;
}

function makeFixture(today: string, timeZone: string): SleepSession[] {
  const week = startOfWeek(shiftDay(today, -7));
  const records: SleepSession[] = [];
  const samples = [-7, 0].flatMap((weekOffset) => {
    const sampleWeek = shiftDay(week, weekOffset);
    return [
      ...[0, 1, 2, 3].flatMap((dayOffset) => {
        const day = shiftDay(sampleWeek, dayOffset);
        return [
          { day, startDay: shiftDay(day, -1), startHour: '22', feeling: 'comfortable' as const, minutes: 445 + dayOffset * 5 },
          { day, startDay: day, startHour: '09', feeling: 'tired' as const, minutes: 400 + dayOffset * 5 },
        ];
      }),
      { day: shiftDay(sampleWeek, 5), startDay: shiftDay(sampleWeek, 4), startHour: '23', feeling: 'normal' as const, minutes: 438 },
    ];
  });
  for (const [index, item] of samples.entries()) {
    const end = resolveCivil({ day: item.day, hour: item.startHour === '09' ? '16' : '06', minute: '00' }, timeZone);
    if (end.kind !== 'resolved') continue;
    const endAt = new Date(end.instant);
    const start = new Date(endAt.getTime() - item.minutes * 60_000);
    const startCivil = civilInZone(start, timeZone);
    const endCivil = civilInZone(endAt, timeZone);
    records.push({
      id: `fixture-${index + 1}`, sleepType: 'main', feeling: item.feeling, day: item.day,
      minutes: item.minutes, method: 'range', timeZone, start: startCivil,
      end: endCivil, startAt: start.toISOString(), endAt: endAt.toISOString(), revision: 1,
      confirmedAt: new Date(Date.UTC(2026, 10, 1 + index)).toISOString(),
    });
  }
  const durationDay = shiftDay(week, 6);
  records.push({
    id: 'fixture-duration', sleepType: 'nap', feeling: null, day: durationDay,
    minutes: 83, method: 'duration', revision: 1, confirmedAt: new Date(Date.UTC(2026, 10, 5)).toISOString(),
  });
  records.push({
    id: 'fixture-today-duration', sleepType: 'main', feeling: 'comfortable', day: today,
    minutes: 450, method: 'duration', revision: 1, confirmedAt: new Date().toISOString(),
  });
  return records;
}
