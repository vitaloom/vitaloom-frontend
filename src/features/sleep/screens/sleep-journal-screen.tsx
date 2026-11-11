import { useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, sizing, spacing } from '@/theme';
import { sleepArt } from '../assets/sleep-art';
import { SleepCalendarPicker } from '../components/sleep-calendar-picker';
import { useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import { sleepDay, sleepDuration } from '../utils/sleep-format';
import { SleepCard, SleepButton, SleepNotice, SleepPage } from '../components/sleep-ui';
import type { SleepSession } from '../types/sleep';

export default function SleepJournalScreen() {
  const repository = useSleepRepository();
  const { today } = repository.getContext();
  const theme = useTheme();
  const { sourceIds, sourceVersion } = useLocalSearchParams<{ sourceIds?: string; sourceVersion?: string }>();
  const sources = typeof sourceIds === 'string' ? [...new Set(sourceIds.split(',').filter(Boolean))] : [];
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterDay, setFilterDay] = useState<string | null>(null);
  const query = sources.length
    ? { sourceIds: sources }
    : filterDay ? { from: filterDay, to: filterDay } : undefined;
  const queryKey = `sleep-journal:${sources.join(',') || 'all'}:${filterDay ?? 'all-days'}`;
  const { state, reload } = useSleepRead(() => repository.getJournal(query), queryKey);
  const snapshotKey = state.kind === 'ready' ? `${queryKey}:${state.data.version}` : `${queryKey}:loading`;
  const [extra, setExtra] = useState<{ key: string; sessions: SleepSession[]; nextCursor: string | null; error: string | null } | null>(null);
  const pages = useMemo(() => state.kind === 'ready'
    ? [...state.data.sessions, ...(extra?.key === snapshotKey ? extra.sessions : [])]
    : [], [state, extra, snapshotKey]);
  const nextCursor = state.kind === 'ready' ? extra?.key === snapshotKey ? extra.nextCursor : state.data.nextCursor : null;
  const pageError = extra?.key === snapshotKey ? extra.error : null;
  const staleSources = sources.length > 0 && state.kind === 'ready' && state.data.verified && (
    (sourceVersion && sourceVersion !== state.data.version) || (!nextCursor && pages.length < sources.length)
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const groups = useMemo(() => state.kind === 'ready'
    ? pages.reduce<Record<string, SleepSession[]>>((result, session) => {
      (result[session.day] ??= []).push(session);
      return result;
    }, {})
    : {}, [pages, state.kind]);

  async function loadMore() {
    if (!nextCursor || state.kind !== 'ready' || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result = await repository.getJournal({ ...query, cursor: nextCursor });
      if (result.kind === 'error') {
        setExtra({ key: snapshotKey, sessions: extra?.key === snapshotKey ? extra.sessions : [], nextCursor, error: result.message });
        return;
      }
      if (!result.data.verified) {
        setExtra({ key: snapshotKey, sessions: extra?.key === snapshotKey ? extra.sessions : [], nextCursor, error: 'History couldn’t be fully verified.' });
        return;
      }
      setExtra(previous => {
        const accumulated = previous?.key === snapshotKey ? previous.sessions : [];
        const ids = new Set([...state.data.sessions, ...accumulated].map(session => session.id));
        return { key: snapshotKey, sessions: [...accumulated, ...result.data.sessions.filter(session => !ids.has(session.id))], nextCursor: result.data.nextCursor, error: null };
      });
    } catch {
      setExtra({ key: snapshotKey, sessions: extra?.key === snapshotKey ? extra.sessions : [], nextCursor, error: 'History couldn’t be fully verified.' });
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }

  function applyFilter(day: string | null) {
    if (day !== filterDay) {
      setExtra(null);
      setFilterDay(day);
    }
    setFilterOpen(false);
  }

  return <SleepPage title={sources.length ? 'Source Records' : 'Sleep Journal'}
    subtitle={sources.length ? 'Records linked to this insight' : filterDay ? sleepDay(filterDay) : 'Your confirmed sleep sessions'}
    fallback={sources.length ? '/sleep/insights' : '/sleep'} wellness wellnessHero
    footer={!sources.length ? <SleepButton label="Add Sleep" onPress={() => router.push('/sleep/record')} /> : undefined}
    headerAction={!sources.length ? <Pressable accessibilityRole="button" accessibilityLabel="Filter by date"
      accessibilityState={{ expanded: filterOpen }} onPress={() => setFilterOpen(true)}
      style={[styles.filterButton, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
      <ThemedText variant="labelStrong" themeColor="accent">{filterDay ? 'Date' : 'Calendar'}</ThemedText>
    </Pressable> : undefined}>
    {!sources.length && filterOpen ? <SleepCalendarPicker title="Filter by date" selected={filterDay} anchor={today}
      maximumDay={today} onSelect={applyFilter} onClear={filterDay ? () => applyFilter(null) : undefined}
      onClose={() => setFilterOpen(false)} /> : null}
    {state.kind === 'loading' ? <SleepNotice title="Loading journal" loading /> : null}
    {state.kind === 'error' ? <SleepNotice title="Journal couldn’t load" message={state.message} actionLabel="Try again" onAction={reload} error /> : null}
    {state.kind === 'ready' && !state.data.verified ? <SleepNotice title="History couldn’t be fully verified" message="Reload before treating this list as complete." actionLabel="Reload" onAction={reload} error /> : null}
    {staleSources ? <SleepNotice title="Source records changed" message="Return to the insight and reload its evidence." /> : null}
    {state.kind === 'ready' && state.data.verified && !staleSources && !pages.length
      ? <SleepNotice title={filterDay ? 'No sleep records for this day' : 'No recorded sleep yet'}
        message={filterDay ? 'There are no confirmed records for this statistical day.' : 'Record a session to start your journal.'} /> : null}
    {state.kind === 'ready' && state.data.verified && !staleSources ? Object.entries(groups).sort(([a], [b]) => b.localeCompare(a)).map(([day, sessions]) =>
      <View key={day} style={styles.group}>
        <View style={styles.dayHeading}>
          <ThemedText variant="heading">{sleepDay(day)}</ThemedText>
          <ThemedText variant="caption" themeColor="textSecondary">{sessions.length} {sessions.length === 1 ? 'record' : 'records'}</ThemedText>
        </View>
        {sessions.map(session => <SleepCard key={session.id} onPress={() => router.push({ pathname: '/sleep/journal/[id]', params: { id: session.id } })}
          label={`View ${session.sleepType === 'main' ? 'main sleep' : 'nap'}, ${sleepDuration(session.minutes)}, ${sleepDay(session.day)}, ${session.method === 'range' ? 'start and end times' : 'duration only'}${session.feeling ? `, feeling ${session.feeling}` : ''}`}>
          <View style={styles.sessionRow}>
            <Image source={session.sleepType === 'main' ? sleepArt.bed : sleepArt.pillow} resizeMode="contain" accessible={false} style={styles.sessionArt} />
            <View style={styles.sessionContent}>
              <View style={styles.sessionHeading}>
                <ThemedText variant="labelStrong">{session.sleepType === 'main' ? 'Main Sleep' : 'Nap'}</ThemedText>
                <ThemedText variant="heading" themeColor="accent">{sleepDuration(session.minutes)}</ThemedText>
              </View>
              <ThemedText variant="label" themeColor="textSecondary">
                {session.method === 'range'
                  ? `Start ${session.start.hour}:${session.start.minute} · Wake ${session.end.hour}:${session.end.minute}`
                  : 'Estimated duration · no clock times provided'}
              </ThemedText>
              <View style={styles.sessionFooter}>
                <ThemedText variant="caption" themeColor="textSecondary">{session.method === 'range' ? 'Start & End' : 'Duration only'}</ThemedText>
                {session.feeling ? <ThemedText variant="labelStrong" themeColor="accent">Feeling · {session.feeling}</ThemedText> : null}
              </View>
            </View>
          </View>
        </SleepCard>)}
      </View>) : null}
    {pageError ? <SleepNotice title="More records couldn’t load" message={pageError} actionLabel="Try again" onAction={() => void loadMore()} error /> : null}
    {state.kind === 'ready' && state.data.verified && !staleSources && nextCursor ? <SleepButton label="Load more" onPress={() => void loadMore()} variant="secondary" disabled={loadingMore} busy={loadingMore} /> : null}
  </SleepPage>;
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  dayHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sessionArt: { width: 56, height: 56 },
  sessionContent: { flex: 1, minWidth: 180, gap: spacing.xs },
  sessionHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  sessionFooter: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.xs },
  filterButton: { minWidth: sizing.controlComfortable, minHeight: sizing.controlComfortable, paddingHorizontal: spacing.sm,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: radius.full },
});
