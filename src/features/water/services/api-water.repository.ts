import { apiRequest } from '../../../lib/api/http-client';
import type {
  CreateWaterLogInput,
  DailyWaterSummary,
  LocalDate,
  WaterLog,
  WaterRepository,
  WeeklyWaterSummary,
} from '../types/water';

type ApiRequest = <T>(path: string, init?: RequestInit, authenticated?: boolean) => Promise<T>;
type TimeZoneProvider = () => string | null;

type WaterLogDto = Pick<WaterLog, 'id' | 'amountMl' | 'loggedAt'>;
type DailySummaryDto = Omit<DailyWaterSummary, 'logs'> & { logs: WaterLogDto[] };

function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

function mapLog(log: WaterLogDto, source: WaterLog['source'] = 'custom'): WaterLog {
  return { ...log, source };
}

export class ApiWaterRepository implements WaterRepository {
  private revision = 0;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly request: ApiRequest = apiRequest,
    private readonly getTimeZone: TimeZoneProvider = deviceTimeZone,
  ) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getRevision = (): number => this.revision;

  private timeZoneQuery(): string {
    const timeZone = this.getTimeZone();
    if (!timeZone) throw new Error('Unable to determine your device timezone.');
    return `timeZone=${encodeURIComponent(timeZone)}`;
  }

  async getDailySummary(date: LocalDate): Promise<DailyWaterSummary> {
    const query = this.timeZoneQuery();
    const summary = await this.request<DailySummaryDto>(
      `/water/daily-summary?date=${encodeURIComponent(date)}&${query}`,
      {},
      true,
    );
    return { ...summary, logs: summary.logs.map((log) => mapLog(log)) };
  }

  async getWeeklySummary(weekStart: LocalDate): Promise<WeeklyWaterSummary> {
    const query = this.timeZoneQuery();
    return this.request<WeeklyWaterSummary>(
      `/water/weekly-progress?weekStart=${encodeURIComponent(weekStart)}&${query}`,
      {},
      true,
    );
  }

  async createLog(input: CreateWaterLogInput): Promise<WaterLog> {
    const created = await this.request<WaterLogDto>('/water/logs', {
      method: 'POST',
      body: JSON.stringify({ amountMl: input.amountMl, loggedAt: input.loggedAt }),
    }, true);
    this.revision += 1;
    this.listeners.forEach((listener) => listener());
    return mapLog(created, input.source);
  }
}
