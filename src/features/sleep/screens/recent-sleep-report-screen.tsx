import { router } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { translate, useI18n, useTranslations } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { spacing } from '@/theme';
import { sleepFixturesEnabled } from '../api/get-sleep-repository';
import { sleepArt } from '../assets/sleep-art';
import { SleepButton, SleepCard, SleepNotice, SleepPage } from '../components/sleep-ui';
import { useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import { sleepMessages } from '../messages';
import type { RecentSleepReport } from '../types/sleep';
import { sleepDay } from '../utils/sleep-format';
import { RecentSleepStory } from '../components/recent-sleep-story';

export default function RecentSleepReportScreen() {
  const t = useTranslations(sleepMessages);
  const { locale } = useI18n();
  const fixtures = sleepFixturesEnabled();
  const repository = useSleepRepository();
  const { state, reload } = useSleepRead(() => repository.getRecent(), 'sleep-recent', false, true);

  return <SleepPage title={t('recentReport')} fallback="/sleep" demo={fixtures}>
    {state.kind === 'loading' ? <SleepNotice title={t('loading')} loading /> : null}
    {state.kind === 'error' ? <SleepNotice title={fixtures ? t('recentDemoUnavailable') : t('loadError')}
      message={state.message} error={!fixtures} actionLabel={fixtures ? undefined : t('tryAgain')} onAction={fixtures ? undefined : reload} /> : null}
    {state.kind === 'ready' ? <RecentReport report={state.data} locale={locale} /> : null}
  </SleepPage>;
}

function RecentReport({ report, locale }: { report: RecentSleepReport; locale: string }) {
  const t = useTranslations(sleepMessages);
  const { language } = useI18n();
  const theme = useTheme();
  const a01Coverage = report.insights.find((insight) => insight.code === 'A01');
  const highlights = report.dataStatus === 'verified' ? (report.highlights ?? report.insights) : [];
  const maxRecordedMinutes = Math.max(1, ...report.days
    .filter((day) => day.status === 'recorded' && day.minutes !== null)
    .map((day) => day.minutes ?? 0));
  return <>
    <ThemedText variant="subhead" themeColor="textSecondary">
      {t('recentRange', { start: sleepDay(report.period.start, locale), end: sleepDay(report.period.end, locale) })}
    </ThemedText>
    {report.dataStatus === 'unverified-data' ? <SleepNotice title={t('unverifiedReport')} /> : null}
    {report.dataStatus === 'no-data' ? <SleepNotice title={t('reportNoData')} /> : null}
    {report.dataStatus === 'verified' ? <SleepCard tone="mint">
      <View style={styles.metricsRow}>
        <View style={styles.metricsCopy}>
          {report.averageMinutesPerRecordedDay !== null ? <>
            <ThemedText variant="subhead" themeColor="textSecondary">{t('recentAverage')}</ThemedText>
            <ThemedText variant="display">{formatDuration(report.averageMinutesPerRecordedDay, locale, language)}</ThemedText>
          </> : null}
          <ThemedText variant="bodyStrong">{t('recentCoverage')}: {report.recordedDays}/{report.coverageDenominator}</ThemedText>
        </View>
        <Image source={sleepArt.combinedHero} style={styles.metricsArt} resizeMode="contain" accessible={false} />
      </View>
    </SleepCard> : null}
    {report.dataStatus === 'no-data' ? <SleepCard>
      <ThemedText variant="body">{t('recentCoverage')}: {report.recordedDays}/{report.coverageDenominator}</ThemedText>
    </SleepCard> : null}
    <SleepCard>
      <ThemedText accessibilityRole="header" variant="heading">{t('reportMetrics')}</ThemedText>
      <View style={styles.chart}>
        {report.days.map((day) => {
          const recorded = day.status === 'recorded' && day.minutes !== null;
          const minutes = recorded ? day.minutes : null;
          const barHeight = minutes === null ? 0 : Math.max(1, (minutes / maxRecordedMinutes) * 72);
          const status = minutes !== null ? formatDuration(minutes, locale, language)
            : day.status === 'unverified' ? t('dayUnverified') : t('notRecorded');
          return <View key={day.day} accessible accessibilityLabel={`${sleepDay(day.day, locale)}. ${status}`} style={styles.chartDay}>
            <View style={[styles.barTrack, { height: 76 }]}>
              {recorded
                ? <View style={[styles.recordedBar, { height: barHeight, backgroundColor: theme.sleep }]} />
                : <View style={[styles.emptyBar, { backgroundColor: day.status === 'unverified' ? 'transparent' : theme.border,
                  borderColor: day.status === 'unverified' ? theme.textSecondary : 'transparent' }]} />}
            </View>
            <ThemedText variant="label">{new Intl.NumberFormat(locale).format(Number(day.day.slice(-2)))}</ThemedText>
          </View>;
        })}
      </View>
      <View style={styles.dayValues} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {report.days.map((day) => <View key={day.day} style={styles.dayValue}>
          <ThemedText variant="labelStrong">{sleepDay(day.day, locale)}</ThemedText>
          <ThemedText variant="caption" themeColor="textSecondary">
            {day.status === 'recorded' && day.minutes !== null ? formatDuration(day.minutes, locale, language)
              : day.status === 'unverified' ? t('dayUnverified') : t('notRecorded')}
          </ThemedText>
        </View>)}
      </View>
    </SleepCard>
    <RecentSleepStory report={report} />
    {report.dataStatus === 'verified' && highlights.length === 0
      ? <SleepNotice title={t('reportInsightsEmpty')} /> : null}
    {highlights.map((insight) => <SleepCard key={insight.code} tone="warm"
      {...(report.dataStatus === 'verified'
        && (('summary' in insight && insight.status === 'READY') || insight.status === 'ready') ? {
        label: insight.code === 'A01' ? t('a01Coverage') : insight.title,
        onPress: () => router.push({ pathname: '/sleep/insights/[code]', params: { code: insight.code } }) } : {})}>
      <ThemedText variant="labelStrong" themeColor="accent">{insight.code}</ThemedText>
      {insight.code === 'A01' ? <>
        <ThemedText variant="body">{t('a01Coverage')}</ThemedText>
        {a01Coverage ? <ThemedText variant="caption" themeColor="textSecondary">
          {t('verifiedDays')}: {a01Coverage.sampleDays}/{a01Coverage.denominatorDays}
        </ThemedText> : null}
      </> : <>
        <ThemedText variant="body">{insight.title}</ThemedText>
        <ThemedText variant="caption" themeColor="textSecondary">{insight.summary}</ThemedText>
      </>}
    </SleepCard>)}
    <SleepButton label={t('viewAllInsights')} variant="secondary" onPress={() => router.push('/sleep/insights')} />
    {report.dataStatus === 'no-data' ? <SleepButton label={t('recordSleep')} onPress={() => router.push('/sleep/record')} /> : null}
  </>;
}

function formatDuration(minutes: number, locale: string, language: 'en' | 'vi') {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  const formatNumber = (value: number) => new Intl.NumberFormat(locale).format(value);
  const t = (key: 'durationHours' | 'durationMinutes' | 'durationHoursAndMinutes', values: { hours: string; minutes: string }) =>
    translate(language, sleepMessages, key, values);
  return hours > 0
    ? remainder ? t('durationHoursAndMinutes', { hours: formatNumber(hours), minutes: formatNumber(remainder) })
      : t('durationHours', { hours: formatNumber(hours), minutes: formatNumber(0) })
    : t('durationMinutes', { hours: formatNumber(0), minutes: formatNumber(remainder) });
}

const styles = StyleSheet.create({
  metricsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metricsCopy: { flex: 1, gap: spacing.xs },
  metricsArt: { width: '27%', height: 100, maxWidth: 135 },
  chart: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.xs },
  chartDay: { flex: 1, minWidth: 0, alignItems: 'center', gap: spacing.xs },
  barTrack: { width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  recordedBar: { width: '70%', minWidth: 8, maxWidth: 28, borderRadius: 8 },
  emptyBar: { width: '70%', minWidth: 8, maxWidth: 28, height: 8, borderRadius: 4, borderWidth: 1, borderStyle: 'dashed' },
  dayValues: { gap: spacing.xs, marginTop: spacing.md },
  dayValue: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm },
});
