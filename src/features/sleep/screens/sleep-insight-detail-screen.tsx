import { router, useLocalSearchParams } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { ThemedText } from '@/components/themed-text';
import { spacing } from '@/theme';
import { sleepArt } from '../assets/sleep-art';
import { SleepAiSection } from '../components/sleep-ai-section';
import { sleepFixturesEnabled } from '../api/get-sleep-repository';
import { SleepButton, SleepCard, SleepNotice, SleepPage } from '../components/sleep-ui';
import { useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import type { EvidenceMeasure, InsightCode } from '../types/sleep';
import { startOfWeek } from '../utils/sleep-date';
import { sleepDuration, sleepPeriod } from '../utils/sleep-format';

function evidenceValue(measure: EvidenceMeasure) {
  if (measure.unit === 'minutes') return `${measure.value < 0 ? '−' : ''}${sleepDuration(Math.abs(measure.value))}`;
  return `${Math.round(measure.value)}${measure.unit === 'percent' ? '%' : ` ${measure.unit}`}`;
}

export default function SleepInsightDetailScreen() {
  const params = useLocalSearchParams<{ code: string; week?: string; timeZone?: string; version?: string }>();
  const repository = useSleepRepository();
  const [refreshIdentity, setRefreshIdentity] = useState('');
  const identity = JSON.stringify(params);
  const key = {
    code: params.code as InsightCode, week: params.week ?? startOfWeek(repository.getContext().today),
    timeZone: params.timeZone,
    version: refreshIdentity === identity ? undefined : params.version,
  };
  const { state, reload } = useSleepRead(() => repository.getInsight(key), `insight:${JSON.stringify(key)}`);
  const insight = state.kind === 'ready' ? state.data : null;
  const available = insight?.status === 'ready' && insight.eligible;

  return <SleepPage title="Insight Detail" fallback="/sleep/insights" demo={sleepFixturesEnabled()}>
    {state.kind === 'loading' ? <SleepNotice title="Checking evidence" loading /> : null}
    {state.kind === 'error' ? <SleepNotice title="Could not load this insight" message={state.message}
      error actionLabel="Retry" onAction={reload} /> : null}
    {state.kind === 'ready' && !insight ? <SleepNotice title="Insight unavailable" message="This insight could not be found." /> : null}
    {insight && !available ? <>
      <ThemedText variant="bodyStrong">{insight.title}</ThemedText>
      <ThemedText variant="subhead" themeColor="textSecondary">{sleepPeriod(insight.period.from, insight.period.to)}</ThemedText>
      <SleepNotice title={insight.status === 'stale' ? 'Evidence changed' : 'Evidence is unavailable'}
      message={insight.status === 'stale' ? 'The source records changed. Check the latest evidence for this insight.'
        : insight.status === 'unverified' ? 'Sleep history could not be verified.' : insight.summary || 'This insight has too little evidence.'}
      actionLabel="Check current evidence" onAction={() => {
        if (refreshIdentity === identity) reload();
        else setRefreshIdentity(identity);
      }} /></> : null}
    {insight && available ? <>
      <SleepCard>
        <ThemedText variant="labelStrong" themeColor="accent">{insight.key.code} · {insight.title}</ThemedText>
        <View style={styles.row}>
          <ThemedText variant="heading" style={styles.label}>{insight.summary}</ThemedText>
          <Image source={sleepArt.pillow} resizeMode="contain" accessible={false} style={styles.pillow} />
        </View>
        <ThemedText variant="subhead" themeColor="textSecondary">
          {sleepPeriod(insight.period.from, insight.period.to)}{insight.period.complete ? '' : ' · Week in progress'}
        </ThemedText>
      </SleepCard>
      <SleepCard>
        <ThemedText accessibilityRole="header" variant="heading">Evidence from sleep records</ThemedText>
        <ThemedText variant="subhead" themeColor="textSecondary">{insight.sample} · {insight.coverage}</ThemedText>
        {insight.evidence.map((measure, index) => <View key={`${measure.label}-${index}`} style={styles.row}>
          <View style={styles.label}>
            <ThemedText variant="labelStrong">{measure.label}</ThemedText>
            {measure.detail ? <ThemedText variant="caption" themeColor="textSecondary">{measure.detail}</ThemedText> : null}
          </View>
          <ThemedText variant="bodyStrong" themeColor="accent">{evidenceValue(measure)}</ThemedText>
        </View>)}
      </SleepCard>
      <SleepCard tone="mint">
        <ThemedText accessibilityRole="header" variant="bodyStrong">Interpretation limits</ThemedText>
        {insight.limitations.map((text) => <ThemedText key={text} variant="subhead">{text}</ThemedText>)}
      </SleepCard>
      <SleepAiSection request={{ kind: 'explanation', insight: insight.key }} requestKey={`explanation:${JSON.stringify(insight.key)}`} />
      {insight.sourceIds.length ? <SleepButton variant="secondary" label={`View source records (${insight.sourceIds.length})`}
        onPress={() => router.push({
          pathname: '/sleep/journal',
          params: { sourceIds: insight.sourceIds.join(','), sourceVersion: insight.key.version },
        })} /> : null}
    </> : null}
  </SleepPage>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { flex: 1 },
  pillow: { width: '24%', height: 84 },
});
