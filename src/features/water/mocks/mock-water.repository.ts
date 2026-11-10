import type {
  CreateWaterLogInput,
  DailyWaterSummary,
  LocalDate,
  WaterLog,
  WaterRepository,
  WeeklyWaterSummary,
} from '../types/water';
import { getSevenDatesFromMonday, localDateFromInstant, parseLocalDate } from '../utils/water-date';
import { validateCreateWaterLogInput } from '../utils/water-validation';
import { createWaterSeed } from './water.mock';

export class MockWaterRepository implements WaterRepository {
  private logs: WaterLog[];
  private revision = 0;
  private readonly listeners = new Set<() => void>();
  private nextId = 1;

  constructor(
    now: Date = new Date(),
    seed: WaterLog[] = createWaterSeed(now),
    private readonly getNow: () => Date = () => new Date(),
  ) {
    this.logs = [...seed];
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getRevision = (): number => this.revision;

  async getDailySummary(date: LocalDate): Promise<DailyWaterSummary> {
    if (!parseLocalDate(date)) throw new RangeError(`Invalid local date: ${date}`);
    const logs = this.logs
      .filter((log) => localDateFromInstant(new Date(log.loggedAt)) === date)
      .sort((left, right) => right.loggedAt.localeCompare(left.loggedAt) || right.id.localeCompare(left.id));
    const totalMl = logs.reduce((total, log) => total + log.amountMl, 0);

    return { date, totalMl, goalMl: 2000, percent: Math.round((totalMl / 2000) * 100), logs };
  }

  async getWeeklySummary(weekStart: LocalDate): Promise<WeeklyWaterSummary> {
    const dates = getSevenDatesFromMonday(weekStart);
    const days = await Promise.all(dates.map(async (date) => {
      const summary = await this.getDailySummary(date);
      return { date, totalMl: summary.totalMl, goalMl: summary.goalMl };
    }));
    return { weekStart, weekEnd: dates[6], days };
  }

  async createLog(input: CreateWaterLogInput): Promise<WaterLog> {
    const now = this.getNow();
    const error = validateCreateWaterLogInput(input, now);
    if (error) throw new Error(error);

    const log: WaterLog = {
      id: `water-${Date.now()}-${this.nextId++}`,
      amountMl: input.amountMl,
      loggedAt: input.loggedAt ? new Date(input.loggedAt).toISOString() : now.toISOString(),
      source: input.source,
    };
    this.logs = [...this.logs, log];
    this.revision += 1;
    this.listeners.forEach((listener) => listener());
    return log;
  }
}
