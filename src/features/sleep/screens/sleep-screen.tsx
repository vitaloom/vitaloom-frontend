import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { translate, useI18n, useTranslations, type Language } from '@/i18n';
import { radius, sizing, spacing } from '@/theme';
import { sleepArt } from '../assets/sleep-art';
import { sleepFixturesEnabled } from '../api/get-sleep-repository';
import { SleepButton, SleepCard, SleepNotice, SleepPage } from '../components/sleep-ui';
import { SleepSevenDayChart } from '../components/sleep-seven-day-chart';
import { useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import { sleepMessages } from '../messages';
import type { SleepSession } from '../types/sleep';
import { sleepDay } from '../utils/sleep-format';
import { insightHref } from '../utils/sleep-navigation';
import { sleepCatalogInsightCopy } from '../utils/sleep-catalog-insight-copy';

const destinations = [
  { key: 'journal', path: '/sleep/journal', icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' } },
  { key: 'sleepGoal', path: '/sleep/goal', icon: { ios: 'target', android: 'track_changes', web: 'track_changes' } },
  { key: 'recentReport', path: '/sleep/recent', icon: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' } },
] as const;

function homeDuration(minutes: number, language: Language) {
  const whole = Math.round(minutes);
  const hours = Math.floor(whole / 60);
  const remainder = whole % 60;
  const key = hours === 0 ? 'durationMinutes' : remainder ? 'durationHoursAndMinutes' : 'durationHours';
  return translate(language, sleepMessages, key, { hours, minutes: remainder });
}

export default function SleepScreen() {
  const theme = useTheme();
  const t = useTranslations(sleepMessages);
  const { language, locale } = useI18n();
  const repository = useSleepRepository();
  const { state, reload } = useSleepRead(() => repository.getHome(), 'sleep-home', false, true);
  const openRecordedDay = async (day: string) => {
    const result = await repository.getJournal({ from: day, to: day });
    if (result.kind !== 'ready') return;
    const session = result.data.sessions.find((item) => item.sleepType === 'main' && item.day === day);
    if (session) router.push({ pathname: '/sleep/journal/[id]', params: { id: session.id } });
  };
  const summary = state.kind === 'ready' ? state.data : null;
  const featured = summary?.featured;
  const featuredCopy = featured && 'source' in featured ? sleepCatalogInsightCopy(featured.code, t) : null;

  const fixtures = sleepFixturesEnabled();

  return <SleepPage title={t('title')} subtitle={t('subtitle')} home hero demo={fixtures}>
    {state.kind === 'loading' ? <SleepNotice title={t('loading')} loading /> : null}
    {state.kind === 'error' ? <SleepNotice title={t('loadError')} message={state.message}
      actionLabel={t('tryAgain')} onAction={reload} error /> : null}
    {summary ? <>
      {/* {fixtures && summary.daily.status === 'unverified' ? <SleepNotice title={t('unverified')}
        actionLabel={t('reload')} onAction={reload} /> : <LatestSleep session={summary.latest} />} */}
        
            {featured && ('source' in featured || (featured.eligible && featured.status === 'ready')) ? <SleepCard tone="warm"
      onPress={() => router.push('source' in featured
        ? { pathname: '/sleep/insights/[code]', params: { code: featured.code } }
        : insightHref(featured))} label={t('openFeatured')}>
      <View style={styles.row}>
        <View style={styles.fill}>
          <ThemedText variant="labelStrong" themeColor="accent">{t('featuredInsight')}</ThemedText>
          <ThemedText variant="body">{'source' in featured ? featuredCopy?.title ?? featured.title : featured.summary}</ThemedText>
          {'source' in featured ? <ThemedText variant="subhead">{featuredCopy?.summary ?? featured.summary}</ThemedText> : null}
        </View>
        <Image source={sleepArt.pillow} resizeMode="contain" style={styles.pillow} accessible={false} />
      </View>
    </SleepCard> : null}
      {summary.recentDays ? <SleepCard>
        <ThemedText accessibilityRole="header" variant="heading">{t('reportMetricsShort')}</ThemedText>
        <SleepSevenDayChart locale={locale}
          onRecordedDayPress={openRecordedDay}
          labels={{ recorded: t('calendarRecorded'), missing: t('notRecorded'), unverified: t('dayUnverified') }}
          days={summary.recentDays.map((day) => day.status === 'recorded' && day.minutes !== null
            ? { date: day.day, state: 'recorded', duration: { minutes: day.minutes, label: homeDuration(day.minutes, language) } }
            : { date: day.day, state: day.status === 'not-recorded' ? 'missing' : 'unverified' })} />
      </SleepCard> : null}
    </> : null}
    <SleepButton label={t('recordSleep')} onPress={() => router.push('/sleep/record')} />
    <View style={styles.tiles}>
      {destinations.map(({ key, path, icon }) => {
        const label = t(key);
        return <Pressable key={path} accessibilityRole="button"
          accessibilityLabel={t('openDestination', { destination: label })} onPress={() => router.push(path)}
          style={({ pressed }) => [styles.tile, { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement, borderColor: theme.border }]}>
          <View style={[styles.tileIcon, { backgroundColor: theme.sleepSoft }]} accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            <SymbolView name={icon} tintColor={theme.accent} size={sizing.iconMd} />
          </View>
          <ThemedText variant="labelStrong" style={styles.center}>{label}</ThemedText>
        </Pressable>;
      })}
    </View>
    <SleepButton label={t('insights')} variant="secondary" onPress={() => router.push('/sleep/insights')} />
  </SleepPage>;
}

function LatestSleep({ session }: { session: SleepSession | null }) {
  const theme = useTheme();
  const t = useTranslations(sleepMessages);
  const { language, locale } = useI18n();
  const feelingLabel = { comfortable: t('comfortable'), normal: t('normal'), tired: t('tired') } as const;
  return <SleepCard tone="mint" onPress={session ? () => router.push({ pathname: '/sleep/journal/[id]', params: { id: session.id } }) : undefined}>
    <View style={styles.row}>
      <ThemedText variant="heading" style={styles.fill}>{t('latestSleep')}</ThemedText>
      {session ? <ThemedText variant="label" themeColor="textSecondary">{sleepDay(session.day, locale)}</ThemedText> : null}
    </View>
    {session ? <>
      <View style={styles.row}>
        <ThemedText variant="display" style={styles.fill}>{homeDuration(session.minutes, language)}</ThemedText>
        {session.feeling ? <View style={[styles.feeling, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText variant="labelStrong">{feelingLabel[session.feeling]}</ThemedText>
        </View> : null}
        <ThemedText variant="heading" themeColor="accent" accessible={false}>›</ThemedText>
      </View>
      <ThemedText variant="subhead" themeColor="textSecondary">{t(session.sleepType === 'main' ? 'mainSleep' : 'nap')}</ThemedText>
    </> : <ThemedText variant="body" themeColor="textSecondary">{t('noRecordedSleep')}</ThemedText>}
  </SleepCard>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  fill: { flex: 1, gap: spacing.xs },
  pillow: { width: 92, height: 92 },
  feeling: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { flexGrow: 1, flexBasis: 84, minHeight: sizing.controlComfortable * 1.6, borderRadius: radius.lg, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', padding: spacing.sm, gap: spacing.xs },
  tileIcon: { borderRadius: radius.md, padding: spacing.sm },
  center: { textAlign: 'center' },
});
