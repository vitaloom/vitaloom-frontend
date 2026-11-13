export type Day = string;
export type SleepType = 'main' | 'nap';
export type Feeling = 'comfortable' | 'normal' | 'tired';
export type CivilTime = { day: Day; hour: string; minute: string; offsetMinutes?: number };
export type SleepDraft = { sleepType: SleepType; feeling: Feeling | null } & (
  | { method: 'range'; timeZone: string; start: CivilTime; end: CivilTime }
  | { method: 'duration'; endDay: Day; hours: string; minutes: string }
);
export type SessionValue = { sleepType: SleepType; feeling: Feeling | null; day: Day; minutes: number } & (
  | { method: 'range'; timeZone: string; start: CivilTime; end: CivilTime; startAt: string; endAt: string }
  | { method: 'duration' }
);
export type SleepSession = SessionValue & { id: string; revision: number; confirmedAt: string };
export type SleepContext = { today: Day; timeZone: string };
export type GoalEntry = { effectiveDay: Day; minutes: number | null };
export type GoalState = { minutes: number | null; revision: number; effectiveDay: Day | null; verified: boolean };
export type DayStatus = 'recorded' | 'no-data' | 'unverified' | 'future';
export type DailySummary = {
  day: Day;
  status: DayStatus;
  minutes: number | null;
  goal: GoalState;
  progress: number | null;
};
export type JournalQuery = { from?: Day; to?: Day; cursor?: string; limit?: number; sourceIds?: string[] };
export type JournalPage = { sessions: SleepSession[]; verified: boolean; nextCursor: string | null; version: string };

export type InsightCode = 'A01' | 'A02' | 'A03' | 'A04' | 'A05' | 'B01' | 'B02' | 'B03' | 'B04' | 'C01' | 'C03' | 'C04';
export type InsightCategory = 'patterns' | 'feelings' | 'discoveries';
export type InsightStatus = 'ready' | 'no-data' | 'insufficient' | 'unverified' | 'stale';
export type AnalyticsQuery = { week: Day; timeZone?: string; sleepType?: SleepType };
export type InsightKey = AnalyticsQuery & { code: InsightCode; version?: string };
export type EvidenceMeasure = { label: string; value: number; unit: 'minutes' | 'days' | 'sessions' | 'percent'; detail?: string };
export type Insight = {
  key: InsightKey & { version: string };
  category: InsightCategory;
  title: string;
  status: InsightStatus;
  eligible: boolean;
  period: { from: Day; to: Day; complete: boolean };
  summary: string;
  sample: string;
  coverage: string;
  evidence: EvidenceMeasure[];
  sourceIds: string[];
  limitations: string[];
};
export type InsightList = {
  items: Insight[];
  timeZones: string[];
  status: 'ready' | 'no-data' | 'unverified' | 'stale';
};
export type WeeklySummary = {
  week: Day;
  endDay: Day;
  complete: boolean;
  verified: boolean;
  version: string;
  days: DailySummary[];
  averageMinutes: number | null;
  recordedDays: number | null;
  elapsedDays: number;
  goalMet: number | null;
  goalEligible: number | null;
  feelings: Record<Feeling, number> | null;
  insights: Insight[];
  timeZones: string[];
  storyEligible: boolean;
};
export type HomeSummary = { latest: SleepSession | null; daily: DailySummary; featured: Insight | null };
export type AiRequest =
  | { kind: 'explanation'; insight: InsightKey & { version: string } }
  | { kind: 'story'; query: AnalyticsQuery; version: string };
export type AiResponse =
  | { status: 'fixture'; version: string; headline: string; observations: string[]; limitations: string; sources: InsightCode[] }
  | { status: 'ineligible' | 'consent-required' | 'unavailable' | 'stale' };

export type Mutation =
  | { kind: 'create-session'; draft: SleepDraft }
  | { kind: 'update-session'; id: string; revision: number; draft: SleepDraft }
  | { kind: 'delete-session'; id: string; revision: number }
  | { kind: 'set-goal'; revision: number; hours: string; minutes: string }
  | { kind: 'remove-goal'; revision: number }
  | { kind: 'set-ai-consent'; enabled: boolean };
export type WriteResult =
  | { kind: 'confirmed'; version: string; recordId?: string; revision?: number; effectiveDay?: Day }
  | { kind: 'validation'; field: string; message: string }
  | { kind: 'conflict'; reason: 'overlap' | 'stale' | 'deleted'; message: string }
  | { kind: 'rejected'; message: string }
  | { kind: 'unknown'; attemptId: string };
export type ReadResult<T> =
  | { kind: 'ready'; data: T }
  | { kind: 'error'; message: string; code?: string };
