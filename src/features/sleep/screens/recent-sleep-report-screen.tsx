import { router } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { translate, useI18n, useTranslations } from '@/i18n';
import { SleepSevenDayChart } from '../components/sleep-seven-day-chart';
import { spacing } from '@/theme';
import { sleepFixturesEnabled } from '../api/get-sleep-repository';
import { sleepArt } from '../assets/sleep-art';
import { SleepButton, SleepCard, SleepNotice, SleepPage } from '../components/sleep-ui';
import { useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import { sleepMessages } from '../messages';
import { sleepCatalogInsightCopy } from '../utils/sleep-catalog-insight-copy';
import type { RecentSleepReport } from '../types/sleep';
import { sleepDay } from '../utils/sleep-format';
import { RecentSleepStory } from '../components/recent-sleep-story';

export default function RecentSleepReportScreen() {
  const t = useTranslations(sleepMessages);
  const { locale } = useI18n();
  const fixtures = sleepFixturesEnabled();
  const repository = useSleepRepository();
  const { state, reload } = useSleepRead(() => repository.getRecent(), 'sleep-recent', false, true);
  const openRecordedDay = async (day: string) => {
    const result = await repository.getJournal({ from: day, to: day });
    if (result.kind !== 'ready') return;
    const session = result.data.sessions.find((item) => item.sleepType === 'main' && item.day === day);
    if (session) router.push({ pathname: '/sleep/journal/[id]', params: { id: session.id } });
  };

  return <SleepPage title={t('recentReport')} fallback="/sleep" demo={fixtures}>
    {state.kind === 'loading' ? <SleepNotice title={t('loading')} loading /> : null}
    {state.kind === 'error' ? <SleepNotice title={fixtures ? t('recentDemoUnavailable') : t('loadError')}
      message={state.message} error={!fixtures} actionLabel={fixtures ? undefined : t('tryAgain')} onAction={fixtures ? undefined : reload} /> : null}
    {state.kind === 'ready' ? <RecentReport report={state.data} locale={locale} onRecordedDayPress={openRecordedDay} /> : null}
  </SleepPage>;
}

function RecentReport({ report, locale, onRecordedDayPress }: { report: RecentSleepReport; locale: string; onRecordedDayPress: (day: string) => void }) {
  const t = useTranslations(sleepMessages);
  const { language } = useI18n();
  const a01Coverage = report.insights.find((insight) => insight.code === 'A01');
  const highlights = report.dataStatus === 'verified' ? (report.highlights ?? report.insights) : [];
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
            <ThemedText variant="subhead" themeColor="textSecondary">{t('recentAverageShort')}</ThemedText>
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
      <ThemedText accessibilityRole="header" variant="heading">{t('reportMetricsShort')}</ThemedText>
      <SleepSevenDayChart locale={locale}
        onRecordedDayPress={onRecordedDayPress}
        labels={{ recorded: t('calendarRecorded'), missing: t('notRecorded'), unverified: t('dayUnverified') }}
        days={report.days.map((day) => {
          if (day.status === 'recorded' && day.minutes !== null) {
            return { date: day.day, state: 'recorded', duration: {
              minutes: day.minutes, label: formatDuration(day.minutes, locale, language),
            } };
          }
          return { date: day.day, state: day.status === 'not-recorded' ? 'missing' : 'unverified' };
        })} />
    </SleepCard>
    <RecentSleepStory report={report} />
    {report.dataStatus === 'verified' && highlights.length === 0
      ? <SleepNotice title={t('reportInsightsEmpty')} /> : null}
    {highlights.map((insight) => {
      const catalogCopy = sleepCatalogInsightCopy(insight.code, t);
      const title = catalogCopy?.title ?? ('title' in insight ? insight.title : t('a01Coverage'));
      const summary = catalogCopy?.summary ?? ('summary' in insight ? insight.summary : '');
      return <SleepCard key={insight.code} tone="warm"
      {...(report.dataStatus === 'verified'
        && (('summary' in insight && insight.status === 'READY') || insight.status === 'ready') ? {
        label: insight.code === 'A01' ? t('a01Coverage') : title,
        onPress: () => router.push({ pathname: '/sleep/insights/[code]', params: { code: insight.code } }) } : {})}>
      <ThemedText variant="labelStrong" themeColor="accent">{insight.code}</ThemedText>
      {insight.code === 'A01' ? <>
        <ThemedText variant="body">{t('a01Coverage')}</ThemedText>
        {a01Coverage ? <ThemedText variant="caption" themeColor="textSecondary">
          {t('verifiedDays')}: {a01Coverage.sampleDays}/{a01Coverage.denominatorDays}
        </ThemedText> : null}
      </> : <>
        <ThemedText variant="body">{title}</ThemedText>
        <ThemedText variant="caption" themeColor="textSecondary">{summary}</ThemedText>
      </>}
    </SleepCard>;
    })}
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
});
