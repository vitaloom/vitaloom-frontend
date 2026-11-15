import { router, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useTranslations } from '@/i18n';
import { SleepAiSection } from '../components/sleep-ai-section';
import { SleepButton, SleepCard, SleepNotice, SleepPage } from '../components/sleep-ui';
import { useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import { sleepMessages } from '../messages';
import type { InsightKey, SleepInsightDetail, SleepInsightStatus } from '../types/sleep';
import { startOfWeek } from '../utils/sleep-date';
import { sleepPeriod } from '../utils/sleep-format';

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

function DetailContent({ detail, t, aiKey, reload }: {
  detail: SleepInsightDetail; t: (key: keyof typeof sleepMessages.en) => string; aiKey: InsightKey & { version: string };
  reload: () => void;
}) {
  if (detail.status !== 'READY') return <SleepNotice title={statusMessage(detail.status, t)} />;
  const sourceRefs = Array.isArray(detail.sourceRefs)
    ? detail.sourceRefs.filter((ref): ref is string => typeof ref === 'string') : [];
  return <>
    <SleepCard tone="mint">
      <ThemedText variant="labelStrong" themeColor="accent">{detail.code} · {detail.title}</ThemedText>
      <ThemedText variant="subhead" themeColor="textSecondary">{sleepPeriod(detail.period.start, detail.period.end)}</ThemedText>
      {detail.summary ? <ThemedText variant="heading">{detail.summary}</ThemedText> : null}
    </SleepCard>
    {detail.sample !== undefined ? <SleepCard>
      <ThemedText accessibilityRole="header" variant="bodyStrong">{t('insightSample')}</ThemedText>
      <EvidenceValue label={t('insightSample')} value={detail.sample} />
    </SleepCard> : null}
    {detail.evidence !== undefined ? <SleepCard>
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
    <SleepAiSection key={JSON.stringify(detail.period) + detail.evidenceVersion}
      request={{ kind: 'explanation', insight: aiKey }} requestKey={`explanation:${JSON.stringify(aiKey)}`} onStale={reload} />
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
  const insightCode = code === 'A01' || code === 'B01' ? code : null;
  const { state, reload } = useSleepRead(
    () => insightCode ? repository.getInsightDetail(insightCode) : Promise.resolve({ kind: 'error' as const, message: 'Unsupported insight.' }),
    `sleep-insight-detail:${insightCode ?? 'unsupported'}`,
    false, true,
  );
  const aiKey = state.kind === 'ready' ? {
    code: state.data.code, week: startOfWeek(repository.getContext().today), version: state.data.evidenceVersion,
  } : null;

  return <SleepPage title={t('insightDetail')} fallback="/sleep/insights">
    {state.kind === 'loading' ? <SleepNotice title={t('loadingInsight')} loading /> : null}
    {state.kind === 'error' ? <SleepNotice title={t('insightUnavailable')} message={state.message} error
      actionLabel={t('insightRetry')} onAction={reload} /> : null}
    {state.kind === 'ready' && aiKey ? <DetailContent detail={state.data} t={t} aiKey={aiKey} reload={reload} /> : null}
  </SleepPage>;
}
