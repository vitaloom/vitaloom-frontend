import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { translate, useI18n, useTranslations, type Language } from '@/i18n';
import { radius, sizing, spacing } from '@/theme';
import { sleepArt } from '../assets/sleep-art';
import { SleepButton, SleepCard, SleepNotice, SleepPage } from '../components/sleep-ui';
import { useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import { sleepMessages } from '../messages';
import type { DailySummary, SleepSession } from '../types/sleep';
import { sleepDay } from '../utils/sleep-format';
import { insightHref } from '../utils/sleep-navigation';

const destinations = [
  { key: 'journal', path: '/sleep/journal', icon: '▤' },
  { key: 'insights', path: '/sleep/insights', icon: '▥' },
  { key: 'weeklyReport', path: '/sleep/weekly', icon: '▦' },
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
  const repository = useSleepRepository();
  const { state, reload } = useSleepRead(() => repository.getHome(), 'sleep-home');
  const summary = state.kind === 'ready' ? state.data : null;
  const featured = summary?.featured;

  return <SleepPage title={t('title')} subtitle={t('subtitle')} home hero demo>
    {state.kind === 'loading' ? <SleepNotice title={t('loading')} loading /> : null}
    {state.kind === 'error' ? <SleepNotice title={t('loadError')} actionLabel={t('tryAgain')} onAction={reload} error /> : null}
    {summary ? <>
      {summary.daily.status === 'unverified' ? <SleepNotice title={t('unverified')}
        actionLabel={t('reload')} onAction={reload} /> : <LatestSleep session={summary.latest} />}
      <DailyGoal summary={summary.daily} />
    </> : null}
    {featured?.eligible && featured.status === 'ready' ? <SleepCard tone="warm"
      onPress={() => router.push(insightHref(featured))} label={t('openFeatured')}>
      <View style={styles.row}>
        <View style={styles.fill}>
          <ThemedText variant="labelStrong" themeColor="accent">{t('featuredInsight')}</ThemedText>
          <ThemedText variant="body">{featured.summary}</ThemedText>
        </View>
        <Image source={sleepArt.pillow} resizeMode="contain" style={styles.pillow} accessible={false} />
      </View>
    </SleepCard> : null}
    <SleepButton label={t('recordSleep')} onPress={() => router.push('/sleep/record')} />
    <View style={styles.tiles}>
      {destinations.map(({ key, path, icon }) => {
        const label = t(key);
        return <Pressable key={path} accessibilityRole="button"
          accessibilityLabel={t('openDestination', { destination: label })} onPress={() => router.push(path)}
          style={({ pressed }) => [styles.tile, { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText variant="heading" themeColor="accent" accessible={false}>{icon}</ThemedText>
          <ThemedText variant="labelStrong" style={styles.center}>{label}</ThemedText>
        </Pressable>;
      })}
    </View>
  </SleepPage>;
}

function LatestSleep({ session }: { session: SleepSession | null }) {
  const theme = useTheme();
  const t = useTranslations(sleepMessages);
  const { language, locale } = useI18n();
  const feelingLabel = { comfortable: t('comfortable'), normal: t('normal'), tired: t('tired') } as const;
  return <SleepCard onPress={session ? () => router.push({ pathname: '/sleep/journal/[id]', params: { id: session.id } }) : undefined}>
    <View style={styles.row}>
      <ThemedText variant="heading" style={styles.fill}>{t('latestSleep')}</ThemedText>
      {session ? <ThemedText variant="label" themeColor="textSecondary">{sleepDay(session.day, locale)}</ThemedText> : null}
    </View>
    {session ? <>
      <View style={styles.row}>
        <ThemedText variant="display" style={styles.fill}>{homeDuration(session.minutes, language)}</ThemedText>
        {session.feeling ? <View style={[styles.feeling, { backgroundColor: theme.stepsSoft }]}>
          <ThemedText variant="labelStrong">{feelingLabel[session.feeling]}</ThemedText>
        </View> : null}
        <ThemedText variant="heading" themeColor="accent" accessible={false}>›</ThemedText>
      </View>
      <ThemedText variant="subhead" themeColor="textSecondary">{t(session.sleepType === 'main' ? 'mainSleep' : 'nap')}</ThemedText>
    </> : <ThemedText variant="body" themeColor="textSecondary">{t('noRecordedSleep')}</ThemedText>}
  </SleepCard>;
}

function DailyGoal({ summary }: { summary: DailySummary }) {
  const theme = useTheme();
  const t = useTranslations(sleepMessages);
  const { language, locale } = useI18n();
  const goal = summary.goal;
  const progress = summary.progress === null ? null : Math.round(summary.progress);
  return <SleepCard onPress={() => router.push('/sleep/goal')}>
    <View style={styles.row}>
      <ThemedText variant="heading" style={styles.fill}>{t('sleepGoal')}</ThemedText>
      {goal.minutes !== null && goal.verified ? <ThemedText variant="label" themeColor="textSecondary">{t('daily', { duration: homeDuration(goal.minutes, language) })}</ThemedText> : null}
    </View>
    <ThemedText variant={summary.minutes === null ? 'subhead' : 'metric'}>
      {summary.minutes !== null ? homeDuration(summary.minutes, language) : summary.status === 'unverified' ? t('todayUnavailable') : t('noSleepToday')}
    </ThemedText>
    {summary.minutes !== null ? <ThemedText variant="caption" themeColor="textSecondary">{t('totalToday')}</ThemedText> : null}
    {progress !== null ? <View style={styles.row}>
      <View style={[styles.track, { backgroundColor: theme.accentSoft }]} accessibilityElementsHidden>
        <View style={[styles.bar, { backgroundColor: theme.accent, width: `${Math.min(100, progress)}%` }]} />
      </View>
      <ThemedText variant="labelStrong" themeColor="accent" accessibilityLabel={t('percentGoal', { percent: progress })}>
        {new Intl.NumberFormat(locale, { style: 'percent' }).format(progress / 100)}
      </ThemedText>
    </View> : null}
    {goal.verified && goal.minutes === null ? <ThemedText variant="subhead" themeColor="textSecondary">{t('noActiveGoal')}</ThemedText> : null}
    {!goal.verified ? <ThemedText variant="subhead" themeColor="textSecondary">{t('goalHistoryUnavailable')}</ThemedText> : null}
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
  center: { textAlign: 'center' },
  track: { flex: 1, borderRadius: radius.full, height: 12, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: radius.full },
});
