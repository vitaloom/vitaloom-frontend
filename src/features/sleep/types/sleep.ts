export type Day = string;
export type SleepType = 'main' | 'nap';
export type Feeling = 'comfortable' | 'normal' | 'tired';
export type CivilTime = { day: Day; hour: string; minute: string; offsetMinutes?: number };
export type SleepDraft = { feeling: Feeling | null } & (
  | { method: 'range'; timeZone: string; start: CivilTime; end: CivilTime }
  | { method: 'duration'; endDay: Day; hours: string; minutes: string }
);
export type SessionValue = { sleepType: SleepType; feeling: Feeling | null; day: Day; minutes: number } & (
  | { method: 'range'; timeZone: string; start: CivilTime; end: CivilTime; startAt: string; endAt: string }
  | { method: 'duration' }
);
export type SleepSession = SessionValue & { id: string; revision: number; confirmedAt: string; editable: boolean };
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
export type RecentSleepDay = { day: Day; status: 'recorded' | 'not-recorded' | 'unverified'; minutes: number | null };
export type RecentSleepInsight = { code: 'A01'; status: 'ready'; sampleDays: number; denominatorDays: 7 };
export type RecentSleepHighlight = { code: 'A01' | 'B01'; status: 'READY'; title: string; summary: string };
export type RecentSleepReport = {
  period: { start: Day; end: Day; timeZone: 'Asia/Ho_Chi_Minh' };
  dataStatus: 'no-data' | 'verified' | 'unverified-data';
  days: RecentSleepDay[];
  recordedDays: number | null;
  coverageDenominator: 7;
  averageMinutesPerRecordedDay: number | null;
  insights: RecentSleepInsight[];
  highlights?: RecentSleepHighlight[];
};

export type InsightCode = 'A01' | 'A02' | 'A03' | 'A04' | 'A05' | 'B01' | 'B02' | 'B03' | 'B04' | 'C01' | 'C03' | 'C04';
export type InsightCategory = 'patterns' | 'feelings' | 'discoveries';
export type InsightStatus = 'ready' | 'no-data' | 'insufficient' | 'unverified' | 'stale';
export type AnalyticsQuery = { week: Day; timeZone?: string };
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
export type HomeRecentHighlight = { source: 'recent'; code: RecentSleepHighlight['code']; title: string; summary: string };
export type HomeSummary = { latest: SleepSession | null; daily: DailySummary; featured: Insight | HomeRecentHighlight | null };
export type AiRequest =
  | { kind: 'explanation'; insight: InsightKey & { version: string } }
  | { kind: 'story'; query: AnalyticsQuery; version: string };
export type AiResponse =
  | { status: 'fixture'; version: string; headline: string; observations: string[]; limitations: string; sources: InsightCode[] }
  | { status: 'explanation' | 'fallback'; observation: string; evidenceBasis: string; limitations: string; evidenceFingerprint: string }
  | { status: 'ineligible' | 'consent-required' | 'unavailable' | 'stale' };
export type AiConsent = { enabled: boolean; available: boolean };
export type RecentStoryObservation = {
  insightCode: 'A01' | 'B01'; text: string; dataContext: string; evidenceFingerprint: string;
};
export type RecentStory = {
  status: 'DISABLED' | 'CONSENT_REQUIRED' | 'INELIGIBLE' | 'STORY' | 'FALLBACK';
  headline?: string; observations?: RecentStoryObservation[];
};

export type Mutation =
  | { kind: 'create-session'; draft: SleepDraft }
  | { kind: 'update-session'; id: string; revision: number; confirmedAt?: string; draft: SleepDraft }
  | { kind: 'delete-session'; id: string; revision: number; confirmedAt?: string }
  | { kind: 'set-goal'; revision: number; hours: string; minutes: string }
  | { kind: 'remove-goal'; revision: number }
  | { kind: 'set-ai-consent'; enabled: boolean };
export type WriteResult =
  | { kind: 'confirmed'; version: string; recordId?: string; revision?: number; effectiveDay?: Day }
  | { kind: 'validation'; field: string; message: string }
  | { kind: 'conflict'; reason: 'overlap' | 'stale' | 'deleted' | 'duplicate' | 'week-locked' | 'not-latest'; message: string }
  | { kind: 'rejected'; message: string }
  | { kind: 'unknown'; attemptId: string };
export type ReadResult<T> =
  | { kind: 'ready'; data: T }
  | { kind: 'error'; message: string; code?: string };

export type SleepInsightStatus = 'READY' | 'INSUFFICIENT_DATA' | 'NO_DATA' | 'UNVERIFIED_DATA';
export type SleepInsightCategory = 'A' | 'B';
export type GoalInsightCode = 'A02' | 'B04';
export type CatalogSleepInsightCode = 'A01' | 'A02' | 'A03' | 'B01' | 'B03' | 'B04';
export type SleepInsightItem = {
  code: CatalogSleepInsightCode; category: SleepInsightCategory; status: SleepInsightStatus;
  title: string; highlight?: unknown; locked: boolean; summary?: string; sample?: unknown;
  evidence?: unknown; sourceRefs?: unknown; limitations?: unknown; policyVersion?: string; evidenceVersion?: string;
};
export type SleepInsightPeriod = { start: Day; end: Day; timeZone: string };
export type SleepInsightList = { period: SleepInsightPeriod; items: SleepInsightItem[] };
export type SleepInsightDetail = {
  code: CatalogSleepInsightCode; category: SleepInsightCategory; status: SleepInsightStatus;
  period: SleepInsightPeriod; title: string; summary?: string; sample?: unknown; evidence?: unknown;
  sourceRefs: unknown; limitations: unknown; policyVersion: string; evidenceVersion: string;
};
