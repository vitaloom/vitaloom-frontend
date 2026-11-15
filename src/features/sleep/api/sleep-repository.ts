import type {
  AiRequest, AiResponse, AnalyticsQuery, DailySummary, Day, GoalState, HomeSummary, Insight,
  InsightKey, InsightList, JournalPage, JournalQuery, Mutation, ReadResult, RecentSleepReport, SleepContext, SleepSession,
  WeeklySummary, WriteResult, AiConsent, RecentStory,
  SleepInsightDetail, SleepInsightList,
} from '../types/sleep';

export interface SleepRepository {
  getContext(): SleepContext;
  subscribe(listener: () => void): () => void;
  getHome(): Promise<ReadResult<HomeSummary>>;
  getDaily(day: Day): Promise<ReadResult<DailySummary>>;
  getJournal(query?: JournalQuery): Promise<ReadResult<JournalPage>>;
  getSession(id: string): Promise<ReadResult<SleepSession | null>>;
  getRecent(): Promise<ReadResult<RecentSleepReport>>;
  getGoal(day?: Day): Promise<ReadResult<GoalState>>;
  getWeekly(query: AnalyticsQuery): Promise<ReadResult<WeeklySummary>>;
  getInsights(query: AnalyticsQuery): Promise<ReadResult<InsightList>>;
  getInsight(key: InsightKey): Promise<ReadResult<Insight | null>>;
  getAllInsights(): Promise<ReadResult<SleepInsightList>>;
  getInsightDetail(code: 'A01' | 'B01'): Promise<ReadResult<SleepInsightDetail>>;
  getAiConsent(): Promise<ReadResult<AiConsent>>;
  getAi(request: AiRequest): Promise<ReadResult<AiResponse>>;
  getRecentStory(): Promise<ReadResult<RecentStory>>;
  mutate(attemptId: string, mutation: Mutation): Promise<WriteResult>;
  reconcile(attemptId: string): Promise<WriteResult>;
}
