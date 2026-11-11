import type {
  AiRequest, AiResponse, AnalyticsQuery, DailySummary, Day, GoalState, HomeSummary, Insight,
  InsightKey, InsightList, JournalPage, JournalQuery, Mutation, ReadResult, SleepContext, SleepSession,
  WeeklySummary, WriteResult,
} from '../types/sleep';

export interface SleepRepository {
  getContext(): SleepContext;
  subscribe(listener: () => void): () => void;
  getHome(): Promise<ReadResult<HomeSummary>>;
  getDaily(day: Day): Promise<ReadResult<DailySummary>>;
  getJournal(query?: JournalQuery): Promise<ReadResult<JournalPage>>;
  getSession(id: string): Promise<ReadResult<SleepSession | null>>;
  getGoal(day?: Day): Promise<ReadResult<GoalState>>;
  getWeekly(query: AnalyticsQuery): Promise<ReadResult<WeeklySummary>>;
  getInsights(query: AnalyticsQuery): Promise<ReadResult<InsightList>>;
  getInsight(key: InsightKey): Promise<ReadResult<Insight | null>>;
  getAiConsent(): Promise<ReadResult<boolean>>;
  getAi(request: AiRequest): Promise<ReadResult<AiResponse>>;
  mutate(attemptId: string, mutation: Mutation): Promise<WriteResult>;
  reconcile(attemptId: string): Promise<WriteResult>;
}
