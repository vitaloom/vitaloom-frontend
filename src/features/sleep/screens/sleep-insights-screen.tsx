import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useTranslations } from '@/i18n';
import { SleepCard, SleepNotice, SleepPage } from '../components/sleep-ui';
import { useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import { sleepMessages } from '../messages';
import type { SleepInsightItem, SleepInsightStatus } from '../types/sleep';
import { sleepGoalInsightCopy } from '../utils/sleep-goal-insight-copy';

function statusMessage(status: SleepInsightStatus, t: (key: keyof typeof sleepMessages.en) => string) {
  if (status === 'READY') return t('insightStatusReady');
  if (status === 'INSUFFICIENT_DATA') return t('insightStatusInsufficient');
  if (status === 'NO_DATA') return t('insightStatusNoData');
  return t('insightStatusUnverified');
}

function InsightRow({ item, t }: {
  item: SleepInsightItem;
  t: (key: keyof typeof sleepMessages.en, values?: Record<string, string | number>) => string;
}) {
  const goalCopy = item.code === 'A02' || item.code === 'B04'
    ? sleepGoalInsightCopy(item.code, item.sample, item.evidence, t) : null;
  const title = goalCopy?.title ?? item.title;
  const summary = goalCopy ? goalCopy.summary : item.summary;
  return <SleepCard onPress={() => router.push({ pathname: '/sleep/insights/[code]', params: { code: item.code } })}
    label={`${title}. ${item.locked ? statusMessage(item.status, t) : summary ?? ''}`}>
    <ThemedText variant="labelStrong">{item.code} · {title}</ThemedText>
    {item.locked
      ? <ThemedText variant="subhead" themeColor="textSecondary">{statusMessage(item.status, t)}</ThemedText>
      : <>
        {summary ? <ThemedText variant="subhead" themeColor="textSecondary">{summary}</ThemedText> : null}
      </>}
  </SleepCard>;
}

export default function SleepInsightsScreen() {
  const repository = useSleepRepository();
  const { state, reload } = useSleepRead(() => repository.getAllInsights(), 'sleep-insights:all');
  const t = useTranslations(sleepMessages);
  const items = state.kind === 'ready' ? state.data.items : [];
  const patterns = items.filter(({ category }) => category === 'A');
  const feelings = items.filter(({ category }) => category === 'B');

  return <SleepPage title={t('insightsTitle')} subtitle={t('insightsSubtitle')} hero wellness={items.length === 0}>
    {state.kind === 'loading' ? <SleepNotice title={t('loadingInsights')} loading /> : null}
    {state.kind === 'error' ? <SleepNotice title={t('failedInsights')} message={state.message} error
      actionLabel={t('insightRetry')} onAction={reload} /> : null}
    {state.kind === 'ready' && items.length === 0 ? <SleepNotice title={t('insightsEmpty')} /> : null}
    {patterns.length ? <>
      <ThemedText accessibilityRole="header" variant="heading">{t('insightGroupA')}</ThemedText>
      {patterns.map((item) => <InsightRow key={item.code} item={item} t={t} />)}
    </> : null}
    {feelings.length ? <>
      <ThemedText accessibilityRole="header" variant="heading">{t('insightGroupB')}</ThemedText>
      {feelings.map((item) => <InsightRow key={item.code} item={item} t={t} />)}
    </> : null}
  </SleepPage>;
}
