import { Image, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme';
import { sleepArt } from '../assets/sleep-art';
import type { AnalyticsQuery, WeeklySummary } from '../types/sleep';
import { sleepDuration } from '../utils/sleep-format';
import { SleepAiSection } from './sleep-ai-section';
import { SleepInsightCard } from './sleep-insight-card';
import { SleepCard, SleepNotice } from './sleep-ui';
import { SleepWeekChart } from './sleep-week-chart';

const feelingLabels = [
  { feeling: 'comfortable', label: 'Comfortable' },
  { feeling: 'normal', label: 'Normal' },
  { feeling: 'tired', label: 'Tired' },
] as const;

export function SleepWeeklyContent({ report, query, reload }: {
  report: WeeklySummary; query: AnalyticsQuery; reload: () => void;
}) {
  const theme = useTheme();
  if (!report.verified) return <SleepNotice title="History is unverified"
    message="We could not verify the full week." actionLabel="Retry" onAction={reload} />;
  const metrics = [
    ['Average sleep', report.averageMinutes === null ? '—' : sleepDuration(report.averageMinutes)],
    ['Recorded', `${report.recordedDays} of ${report.elapsedDays} days`],
    ['Goal met', report.goalEligible && report.goalMet !== null ? `${report.goalMet} of ${report.goalEligible}` : '—'],
  ];
  const assessmentCount = report.feelings ? Object.values(report.feelings).reduce((sum, count) => sum + count, 0) : 0;
  return <>
    {!report.complete ? <ThemedText variant="label" themeColor="textSecondary">Week in progress · coverage through today</ThemedText> : null}
    <View style={styles.row}>
      {metrics.map(([label, value]) => <View key={label} style={[styles.metric, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText variant="caption" themeColor="textSecondary">{label}</ThemedText>
        <ThemedText variant="bodyStrong">{value}</ThemedText>
      </View>)}
    </View>
    {report.storyEligible ? <SleepAiSection
      request={{ kind: 'story', query, version: report.version }}
      requestKey={`story:${JSON.stringify(query)}:${report.version}`} /> : null}
    <SleepWeekChart days={report.days} />
    {report.recordedDays === 0 ? <SleepNotice title="No sleep records for this week" /> : null}
    {report.insights.length ? <>
      <ThemedText accessibilityRole="header" variant="heading">Weekly insights</ThemedText>
      {report.insights.map((insight) => <SleepInsightCard key={insight.key.code} insight={insight} />)}
    </> : null}
    {report.feelings && assessmentCount > 0 ? <SleepCard>
      <ThemedText accessibilityRole="header" variant="heading">How you felt this week</ThemedText>
      <ThemedText variant="subhead" themeColor="textSecondary">{assessmentCount} assessed sessions</ThemedText>
      <View style={styles.row}>
        {feelingLabels.map(({ feeling, label }) => <View key={feeling} style={[styles.metric, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}>
          <Image source={sleepArt[feeling]} accessible={false} style={styles.feeling} resizeMode="contain" />
          <ThemedText variant="caption">{label}</ThemedText>
          <ThemedText variant="bodyStrong">{report.feelings?.[feeling]}</ThemedText>
        </View>)}
      </View>
    </SleepCard> : null}
  </>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: { flexGrow: 1, flexBasis: 80, borderWidth: 1, borderRadius: radius.lg, padding: spacing.sm, alignItems: 'center', gap: spacing.xs },
  feeling: { width: 42, height: 42 },
});
