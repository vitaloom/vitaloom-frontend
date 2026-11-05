import type { useTheme } from '@/hooks/use-theme';

export type AmountChoice = 100 | 250 | 500 | 'custom';
export type Theme = ReturnType<typeof useTheme>;

/** A local calendar day in YYYY-MM-DD form. */
export type LocalDate = string;
/** An ISO 8601 timestamp representing an instant. */
export type ISODateTime = string;

export type LandingQuickAmount = 100 | 250 | 500;
export type DetailQuickAmount = 100 | 200 | 500 | 750;
export type WaterLogSource = 'quick-add' | 'custom';

export interface WaterLog {
  id: string;
  amountMl: number;
  loggedAt: ISODateTime;
  source: WaterLogSource;
}

export interface CreateWaterLogInput {
  amountMl: number;
  loggedAt: ISODateTime;
  source: WaterLogSource;
}

export interface DailyWaterSummary {
  date: LocalDate;
  totalMl: number;
  goalMl: number;
  percent: number;
  logs: WaterLog[];
}

export interface WeeklyWaterPoint {
  date: LocalDate;
  totalMl: number;
  goalMl: number;
}

export interface WeeklyWaterSummary {
  weekStart: LocalDate;
  weekEnd: LocalDate;
  days: WeeklyWaterPoint[];
}

export interface WaterRepository {
  getDailySummary(date: LocalDate): Promise<DailyWaterSummary>;
  getWeeklySummary(weekStart: LocalDate): Promise<WeeklyWaterSummary>;
  createLog(input: CreateWaterLogInput): Promise<WaterLog>;
  subscribe(listener: () => void): () => void;
  getRevision(): number;
}
