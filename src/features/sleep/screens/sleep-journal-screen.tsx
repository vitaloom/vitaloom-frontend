import { useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import { sleepDay, sleepDuration } from '../utils/sleep-format';
import { SleepCard, SleepButton, SleepNotice, SleepPage } from '../components/sleep-ui';
import type { SleepSession } from '../types/sleep';

export default function SleepJournalScreen() {
  const repository = useSleepRepository();
  const { sourceIds, sourceVersion } = useLocalSearchParams<{ sourceIds?: string; sourceVersion?: string }>();
  const sources = typeof sourceIds === 'string' ? [...new Set(sourceIds.split(',').filter(Boolean))] : [];
  const query = sources.length ? { sourceIds: sources } : undefined;
  const queryKey = 'sleep-journal:' + (sources.join(',') || 'all');
  const { state, reload } = useSleepRead(() => repository.getJournal(query), queryKey);
  const snapshotKey = state.kind === 'ready' ? queryKey + ':' + state.data.version : queryKey + ':loading';
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
        const ids = new Set(accumulated.map(session => session.id));
        return { key: snapshotKey, sessions: [...accumulated, ...result.data.sessions.filter(session => !ids.has(session.id))], nextCursor: result.data.nextCursor, error: null };
      });
    } catch {
      setExtra({ key: snapshotKey, sessions: extra?.key === snapshotKey ? extra.sessions : [], nextCursor, error: 'History couldn’t be fully verified.' });
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }

  return <SleepPage title={sources.length ? 'Source Records' : 'Sleep Journal'} subtitle={sources.length ? 'Records linked to this insight' : 'Your confirmed sleep sessions'}
    fallback={sources.length ? '/sleep/insights' : '/sleep'}>
    {state.kind === 'loading' ? <SleepNotice title="Loading journal" loading /> : null}
    {state.kind === 'error' ? <SleepNotice title="Journal couldn’t load" message={state.message} actionLabel="Try again" onAction={reload} error /> : null}
    {state.kind === 'ready' && !state.data.verified ? <SleepNotice title="History couldn’t be fully verified" message="Reload before treating this list as complete." actionLabel="Reload" onAction={reload} error /> : null}
    {staleSources ? <SleepNotice title="Source records changed" message="Return to the insight and reload its evidence." /> : null}
    {state.kind === 'ready' && state.data.verified && !staleSources && !pages.length ? <SleepNotice title="No recorded sleep yet" message="Record a session to start your journal." /> : null}
    {state.kind === 'ready' && state.data.verified && !staleSources ? Object.entries(groups).sort(([a], [b]) => b.localeCompare(a)).map(([day, sessions]) =>
      <View key={day} style={{ gap: 9 }}>
        <ThemedText variant="heading">{sleepDay(day)}</ThemedText>
        {sessions.map(session => <SleepCard key={session.id} onPress={() => router.push({ pathname: '/sleep/journal/[id]', params: { id: session.id } })} label={'View ' + session.sleepType + ' ' + sleepDuration(session.minutes) + ' session'}>
          <View style={{ gap: 5 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
              <ThemedText variant="labelStrong">{session.sleepType === 'main' ? 'Main sleep' : 'Nap'} · {sleepDuration(session.minutes)}</ThemedText>
              <ThemedText variant="labelStrong" themeColor="accent">{session.feeling ?? 'Not provided'}</ThemedText>
            </View>
            <ThemedText variant="label" themeColor="textSecondary">
              {session.method === 'range' ? session.start.day + ' ' + session.start.hour + ':' + session.start.minute + '–' + session.end.day + ' ' + session.end.hour + ':' + session.end.minute + ' · ' + session.timeZone : 'Estimated duration · no clock times provided'}
            </ThemedText>
          </View>
        </SleepCard>)}
      </View>) : null}
    {pageError ? <SleepNotice title="More records couldn’t load" message={pageError} actionLabel="Try again" onAction={() => void loadMore()} error /> : null}
    {state.kind === 'ready' && state.data.verified && !staleSources && nextCursor ? <SleepButton label="Load more" onPress={() => void loadMore()} variant="secondary" disabled={loadingMore} busy={loadingMore} /> : null}
    {!sources.length ? <SleepButton label="Record sleep" onPress={() => router.push('/sleep/record')} variant="secondary" /> : null}
  </SleepPage>;
}
