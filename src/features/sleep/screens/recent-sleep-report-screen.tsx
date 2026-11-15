import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { translate, useI18n, useTranslations } from '@/i18n';
import { spacing } from '@/theme';
import { sleepFixturesEnabled } from '../api/get-sleep-repository';
import { SleepButton, SleepCard, SleepNotice, SleepPage } from '../components/sleep-ui';
import { useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import { sleepMessages } from '../messages';
import type { RecentSleepReport } from '../types/sleep';
import { sleepDay } from '../utils/sleep-format';

export default function RecentSleepReportScreen() {
  const t = useTranslations(sleepMessages);
  const { locale } = useI18n();
  const fixtures = sleepFixturesEnabled();
  const repository = useSleepRepository();
  const { state, reload } = useSleepRead(() => repository.getRecent(), 'sleep-recent');

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
  const a01Coverage = report.insights.find((insight) => insight.code === 'A01');
  return <>
    <ThemedText variant="subhead" themeColor="textSecondary">
      {t('recentRange', { start: sleepDay(report.period.start, locale), end: sleepDay(report.period.end, locale) })}
    </ThemedText>
    {report.dataStatus === 'unverified-data' ? <SleepNotice title={t('unverifiedReport')} /> : null}
    {report.dataStatus === 'no-data' ? <SleepNotice title={t('reportNoData')} /> : null}
    {report.dataStatus === 'verified' ? <SleepCard>
      <ThemedText variant="heading">{t('reportMetrics')}</ThemedText>
      <ThemedText variant="body">{t('recentCoverage')}: {report.recordedDays}/{report.coverageDenominator}</ThemedText>
      {report.averageMinutesPerRecordedDay !== null
        ? <ThemedText variant="body">{t('recentAverage')}: {formatDuration(report.averageMinutesPerRecordedDay, locale, language)}</ThemedText>
        : null}
    </SleepCard> : null}
    {report.dataStatus === 'no-data' ? <SleepCard>
      <ThemedText variant="body">{t('recentCoverage')}: {report.recordedDays}/{report.coverageDenominator}</ThemedText>
    </SleepCard> : null}
    <SleepCard>
      <View style={styles.days}>
        {report.days.map((day) => <View key={day.day} style={styles.day}>
          <ThemedText variant="labelStrong">{sleepDay(day.day, locale)}</ThemedText>
          <ThemedText variant="caption" themeColor="textSecondary">
            {day.status === 'recorded' && day.minutes !== null ? formatDuration(day.minutes, locale, language)
              : day.status === 'unverified' ? t('dayUnverified') : t('notRecorded')}
          </ThemedText>
        </View>)}
      </View>
    </SleepCard>
    {report.dataStatus === 'verified' && (report.highlights ?? report.insights).length === 0
      ? <SleepNotice title={t('reportInsightsEmpty')} /> : null}
    {(report.highlights ?? report.insights).map((insight) => <SleepCard key={insight.code} tone="warm"
      {...('summary' in insight && insight.code === 'B01' ? { label: insight.title,
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
  days: { gap: spacing.xs },
  day: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm },
});
