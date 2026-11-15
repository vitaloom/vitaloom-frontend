import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useTranslations } from '@/i18n';
import { radius, sizing, spacing } from '@/theme';
import { SleepCard, SleepNotice, SleepPage } from '../components/sleep-ui';
import { useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import { sleepMessages } from '../messages';
import type { SleepInsightItem, SleepInsightStatus } from '../types/sleep';
import { sleepGoalInsightCopy } from '../utils/sleep-goal-insight-copy';
import { sleepTrendInsightCopy } from '../utils/sleep-trend-insight-copy';

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
  const trendCopy = item.code === 'A03' || item.code === 'B03'
    ? sleepTrendInsightCopy(item.code, item.sample, item.evidence, t) : null;
  const theme = useTheme();
  const title = goalCopy?.title ?? trendCopy?.title ?? item.title;
  const summary = goalCopy ? goalCopy.summary : trendCopy?.summary ?? item.summary;
  return <SleepCard onPress={item.locked ? undefined
    : () => router.push({ pathname: '/sleep/insights/[code]', params: { code: item.code } })}
    label={`${title}. ${item.locked ? statusMessage(item.status, t) : summary ?? ''}`}>
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: item.locked ? theme.backgroundSelected : theme.sleepSoft }]}
        accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <SymbolView size={sizing.iconMd} tintColor={item.locked ? theme.textSecondary : theme.accent}
          name={item.locked ? { ios: 'lock.fill', android: 'lock', web: 'lock' }
            : item.category === 'A' ? { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' }
              : { ios: 'face.smiling', android: 'mood', web: 'mood' }} />
      </View>
      <View style={styles.copy}>
        <ThemedText variant="bodyStrong">{title}</ThemedText>
        <ThemedText variant="subhead" themeColor="textSecondary">
          {item.locked ? statusMessage(item.status, t) : summary || t('insightStatusReady')}
        </ThemedText>
      </View>
      {!item.locked ? <ThemedText accessible={false} variant="heading" themeColor="accent">›</ThemedText> : null}
    </View>
  </SleepCard>;
}

export default function SleepInsightsScreen() {
  const repository = useSleepRepository();
  const { state, reload } = useSleepRead(() => repository.getAllInsights(), 'sleep-insights:all');
  const t = useTranslations(sleepMessages);
  const items = state.kind === 'ready' ? state.data.items : [];
  const patterns = items.filter(({ category }) => category === 'A');
  const feelings = items.filter(({ category }) => category === 'B');

  return <SleepPage title={t('insightsTitle')} subtitle={t('insightsSubtitle')} wellness wellnessHero>
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

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  copy: { flex: 1, gap: spacing.xs },
  icon: { padding: spacing.sm, borderRadius: radius.md },
});
