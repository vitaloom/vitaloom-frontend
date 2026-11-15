import { router, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useI18n, useTranslations } from '@/i18n';
import { SleepAiSection } from '../components/sleep-ai-section';
import { SleepButton, SleepCard, SleepNotice, SleepPage } from '../components/sleep-ui';
import { useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import { sleepMessages } from '../messages';
import type { CatalogSleepInsightCode, InsightKey, SleepInsightDetail, SleepInsightStatus } from '../types/sleep';
import { startOfWeek } from '../utils/sleep-date';
import { sleepDay, sleepDuration, sleepPeriod } from '../utils/sleep-format';
import { sleepGoalInsightCopy } from '../utils/sleep-goal-insight-copy';

function displayValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return String(value);
  try { return JSON.stringify(value); } catch { return ''; }
}

function statusMessage(status: SleepInsightStatus, t: (key: keyof typeof sleepMessages.en) => string) {
  if (status === 'READY') return t('insightStatusReady');
  if (status === 'INSUFFICIENT_DATA') return t('insightStatusInsufficient');
  if (status === 'NO_DATA') return t('insightStatusNoData');
  return t('insightStatusUnverified');
}

function EvidenceValue({ label, value }: { label: string; value: unknown }) {
  return <ThemedText variant="subhead" themeColor="textSecondary">{label}: {displayValue(value)}</ThemedText>;
}

function GoalEvidence({ detail, t, locale }: {
  detail: SleepInsightDetail; t: (key: keyof typeof sleepMessages.en, values?: Record<string, string | number>) => string;
  locale: string;
}) {
  if (!detail.sample || typeof detail.sample !== 'object' || Array.isArray(detail.sample)
    || !detail.evidence || typeof detail.evidence !== 'object' || Array.isArray(detail.evidence)) return null;
  const sample = detail.sample as Record<string, unknown>;
  const evidence = detail.evidence as Record<string, unknown>;
  if (detail.code === 'A02') {
    return <SleepCard>
      <ThemedText accessibilityRole="header" variant="heading">{t('insightEvidence')}</ThemedText>
      <EvidenceValue label={t('goalInsightEligibleDays')} value={sample.eligibleMainDays} />
      <EvidenceValue label={t('goalInsightMetDays')} value={evidence.metGoalDays} />
    </SleepCard>;
  }
  if (detail.code !== 'B04' || !Array.isArray(evidence.exceptions)) return null;
  return <SleepCard>
    <ThemedText accessibilityRole="header" variant="heading">{t('goalInsightExceptions')}</ThemedText>
    <EvidenceValue label={t('goalInsightRatedDays')} value={sample.ratedMain} />
    <EvidenceValue label={t('goalInsightComparableDays')} value={sample.comparableRatedMain} />
    <EvidenceValue label={t('goalInsightExceptions')} value={evidence.exceptionCount} />
    {evidence.exceptions.map((value, index) => {
      if (!value || typeof value !== 'object') return null;
      const row = value as Record<string, unknown>;
      if (typeof row.day !== 'string' || typeof row.minutes !== 'number' || typeof row.goalMinutes !== 'number') return null;
      return <ThemedText key={row.day + index} variant="subhead" themeColor="textSecondary">
        {t('goalInsightException', {
          day: sleepDay(row.day, locale),
          duration: sleepDuration(row.minutes),
          goal: sleepDuration(row.goalMinutes),
        })}
      </ThemedText>;
    })}
  </SleepCard>;
}

function DetailContent({ detail, t, aiKey, locale, reload }: {
  detail: SleepInsightDetail; t: (key: keyof typeof sleepMessages.en, values?: Record<string, string | number>) => string;
  aiKey: (InsightKey & { version: string }) | null; locale: string;
  reload: () => void;
}) {
  const goalCopy = detail.code === 'A02' || detail.code === 'B04'
    ? sleepGoalInsightCopy(detail.code, detail.sample, detail.evidence, t) : null;
  if (detail.status !== 'READY') {
    return goalCopy ? <>
      <SleepCard tone="mint">
        <ThemedText variant="labelStrong" themeColor="accent">{detail.code} · {goalCopy.title}</ThemedText>
        <ThemedText variant="subhead" themeColor="textSecondary">{sleepPeriod(detail.period.start, detail.period.end)}</ThemedText>
      </SleepCard>
      <SleepNotice title={statusMessage(detail.status, t)} />
    </> : <SleepNotice title={statusMessage(detail.status, t)} />;
  }
  const sourceRefs = Array.isArray(detail.sourceRefs)
    ? detail.sourceRefs.filter((ref): ref is string => typeof ref === 'string') : [];
  const title = goalCopy?.title ?? detail.title;
  const summary = goalCopy ? goalCopy.summary : detail.summary;
  return <>
    <SleepCard tone="mint">
      <ThemedText variant="labelStrong" themeColor="accent">{detail.code} · {title}</ThemedText>
      <ThemedText variant="subhead" themeColor="textSecondary">{sleepPeriod(detail.period.start, detail.period.end)}</ThemedText>
      {summary ? <ThemedText variant="heading">{summary}</ThemedText> : null}
    </SleepCard>
    {detail.code === 'A02' || detail.code === 'B04'
      ? <GoalEvidence detail={detail} t={t} locale={locale} />
      : detail.sample !== undefined ? <SleepCard>
      <ThemedText accessibilityRole="header" variant="bodyStrong">{t('insightSample')}</ThemedText>
      <EvidenceValue label={t('insightSample')} value={detail.sample} />
    </SleepCard> : null}
    {detail.code !== 'A02' && detail.code !== 'B04' && detail.evidence !== undefined ? <SleepCard>
      <ThemedText accessibilityRole="header" variant="heading">{t('insightEvidence')}</ThemedText>
      {detail.evidence && typeof detail.evidence === 'object' && !Array.isArray(detail.evidence)
        ? Object.entries(detail.evidence as Record<string, unknown>).map(([label, value]) => <EvidenceValue key={label} label={label} value={value} />)
        : <EvidenceValue label={t('insightEvidence')} value={detail.evidence} />}
    </SleepCard> : null}
    <SleepCard>
      <ThemedText accessibilityRole="header" variant="bodyStrong">{t('insightLimitations')}</ThemedText>
      <EvidenceValue label={t('insightLimitations')} value={detail.limitations} />
      <EvidenceValue label={t('insightSources')} value={detail.sourceRefs} />
      <EvidenceValue label={t('insightPolicy')} value={detail.policyVersion} />
      <EvidenceValue label={t('insightEvidenceVersion')} value={detail.evidenceVersion} />
    </SleepCard>
    {aiKey ? <SleepAiSection key={JSON.stringify(detail.period) + detail.evidenceVersion}
      request={{ kind: 'explanation', insight: aiKey }}
      requestKey={'explanation:' + JSON.stringify(aiKey)} onStale={reload} /> : null}
    {sourceRefs.length > 0 ?
      <SleepButton variant="secondary" label={`${t('insightSources')} (${sourceRefs.length})`}
        onPress={() => router.push({ pathname: '/sleep/journal', params: {
          sourceIds: sourceRefs.join(','), sourceVersion: detail.evidenceVersion,
        } })} /> : null}
  </>;
}

export default function SleepInsightDetailScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const repository = useSleepRepository();
  const t = useTranslations(sleepMessages);
  const { locale } = useI18n();
  const insightCode: CatalogSleepInsightCode | null =
    code === 'A01' || code === 'A02' || code === 'B01' || code === 'B04' ? code : null;
  const { state, reload } = useSleepRead(
    () => insightCode ? repository.getInsightDetail(insightCode) : Promise.resolve({ kind: 'error' as const, message: 'Unsupported insight.' }),
    `sleep-insight-detail:${insightCode ?? 'unsupported'}`,
    false, true,
  );
  const aiKey = state.kind === 'ready' && (state.data.code === 'A01' || state.data.code === 'B01') ? {
    code: state.data.code, week: startOfWeek(repository.getContext().today), version: state.data.evidenceVersion,
  } : null;

  return <SleepPage title={t('insightDetail')} fallback="/sleep/insights">
    {state.kind === 'loading' ? <SleepNotice title={t('loadingInsight')} loading /> : null}
    {state.kind === 'error' ? <SleepNotice title={t('insightUnavailable')} message={state.message} error
      actionLabel={t('insightRetry')} onAction={reload} /> : null}
    {state.kind === 'ready' ? <DetailContent detail={state.data} t={t} locale={locale} aiKey={aiKey} reload={reload} /> : null}
  </SleepPage>;
}
