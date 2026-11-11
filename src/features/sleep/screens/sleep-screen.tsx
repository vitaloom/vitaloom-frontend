import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, sizing, spacing } from '@/theme';
import { sleepArt } from '../assets/sleep-art';
import { SleepButton, SleepCard, SleepNotice, SleepPage } from '../components/sleep-ui';
import { useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import type { DailySummary, SleepSession } from '../types/sleep';
import { sleepDay, sleepDuration } from '../utils/sleep-format';
import { insightHref } from '../utils/sleep-navigation';

const destinations = [
  { label: 'Journal', path: '/sleep/journal', icon: '▤' },
  { label: 'Insights', path: '/sleep/insights', icon: '▥' },
  { label: 'Weekly Report', path: '/sleep/weekly', icon: '▦' },
] as const;

const feelingLabel = { comfortable: 'Comfortable', normal: 'Normal', tired: 'Tired' } as const;

export default function SleepScreen() {
  const theme = useTheme();
  const repository = useSleepRepository();
  const { state, reload } = useSleepRead(() => repository.getHome(), 'sleep-home');
  const summary = state.kind === 'ready' ? state.data : null;
  const featured = summary?.featured;

  return <SleepPage title="Sleep Tracking" subtitle="Track your sleep and explore recorded patterns." home hero demo>
    {state.kind === 'loading' ? <SleepNotice title="Loading your sleep" loading /> : null}
    {state.kind === 'error' ? <SleepNotice title="Could not load sleep" message={state.message} actionLabel="Try again" onAction={reload} error /> : null}
    {summary ? <>
      {summary.daily.status === 'unverified' ? <SleepNotice title="Sleep history is unverified"
        actionLabel="Reload" onAction={reload} /> : <LatestSleep session={summary.latest} />}
      <DailyGoal summary={summary.daily} />
    </> : null}
    {featured?.eligible && featured.status === 'ready' ? <SleepCard tone="warm"
      onPress={() => router.push(insightHref(featured))} label="Open the featured sleep insight">
      <View style={styles.row}>
        <View style={styles.fill}>
          <ThemedText variant="labelStrong" themeColor="accent">Featured Insight</ThemedText>
          <ThemedText variant="body">{featured.summary}</ThemedText>
        </View>
        <Image source={sleepArt.pillow} resizeMode="contain" style={styles.pillow} accessible={false} />
      </View>
    </SleepCard> : null}
    <SleepButton label="＋ Record Sleep" onPress={() => router.push('/sleep/record')} />
    <View style={styles.tiles}>
      {destinations.map(({ label, path, icon }) => <Pressable key={path} accessibilityRole="button"
        accessibilityLabel={`Open ${label}`} onPress={() => router.push(path)}
        style={({ pressed }) => [styles.tile, { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText variant="heading" themeColor="accent" accessible={false}>{icon}</ThemedText>
        <ThemedText variant="labelStrong" style={styles.center}>{label}</ThemedText>
      </Pressable>)}
    </View>
  </SleepPage>;
}

function LatestSleep({ session }: { session: SleepSession | null }) {
  const theme = useTheme();
  return <SleepCard onPress={session ? () => router.push({ pathname: '/sleep/journal/[id]', params: { id: session.id } }) : undefined}>
    <View style={styles.row}>
      <ThemedText variant="heading" style={styles.fill}>Latest Sleep</ThemedText>
      {session ? <ThemedText variant="label" themeColor="textSecondary">{sleepDay(session.day)}</ThemedText> : null}
    </View>
    {session ? <>
      <View style={styles.row}>
        <ThemedText variant="display" style={styles.fill}>{sleepDuration(session.minutes)}</ThemedText>
        {session.feeling ? <View style={[styles.feeling, { backgroundColor: theme.stepsSoft }]}>
          <ThemedText variant="labelStrong">{feelingLabel[session.feeling]}</ThemedText>
        </View> : null}
        <ThemedText variant="heading" themeColor="accent" accessible={false}>›</ThemedText>
      </View>
      <ThemedText variant="subhead" themeColor="textSecondary">{session.sleepType === 'main' ? 'Main Sleep' : 'Nap'}</ThemedText>
    </> : <ThemedText variant="body" themeColor="textSecondary">No recorded sleep yet</ThemedText>}
  </SleepCard>;
}

function DailyGoal({ summary }: { summary: DailySummary }) {
  const theme = useTheme();
  const goal = summary.goal;
  const progress = summary.progress === null ? null : Math.round(summary.progress);
  return <SleepCard onPress={() => router.push('/sleep/goal')}>
    <View style={styles.row}>
      <ThemedText variant="heading" style={styles.fill}>Sleep Goal</ThemedText>
      {goal.minutes !== null && goal.verified ? <ThemedText variant="label" themeColor="textSecondary">{sleepDuration(goal.minutes)} daily</ThemedText> : null}
    </View>
    <ThemedText variant={summary.minutes === null ? 'subhead' : 'metric'}>
      {summary.minutes !== null ? sleepDuration(summary.minutes) : summary.status === 'unverified' ? 'Today’s total unavailable' : 'No sleep recorded today'}
    </ThemedText>
    {summary.minutes !== null ? <ThemedText variant="caption" themeColor="textSecondary">Total recorded today</ThemedText> : null}
    {progress !== null ? <View style={styles.row}>
      <View style={[styles.track, { backgroundColor: theme.accentSoft }]} accessibilityElementsHidden>
        <View style={[styles.bar, { backgroundColor: theme.accent, width: `${Math.min(100, progress)}%` }]} />
      </View>
      <ThemedText variant="labelStrong" themeColor="accent" accessibilityLabel={`${progress} percent of daily goal`}>{progress}%</ThemedText>
    </View> : null}
    {goal.verified && goal.minutes === null ? <ThemedText variant="subhead" themeColor="textSecondary">
      No active goal · 8 hours suggested
    </ThemedText> : null}
    {!goal.verified ? <ThemedText variant="subhead" themeColor="textSecondary">Goal history unavailable</ThemedText> : null}
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
