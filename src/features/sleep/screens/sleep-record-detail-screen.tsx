import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { SleepConfirmation } from '../components/sleep-confirmation';
import { SleepButton, SleepCard, SleepNotice, SleepPage, SleepWriteNotice } from '../components/sleep-ui';
import { useSleepMutation, useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import { sleepDay, sleepDuration } from '../utils/sleep-format';

export default function SleepRecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const repository = useSleepRepository();
  const { state, reload } = useSleepRead(() => repository.getSession(id), `sleep-session:${id}`);
  const [confirmationRevision, setConfirmationRevision] = useState<number | null>(null);
  const remove = useSleepMutation(() => router.dismissTo('/sleep/journal'), `delete-session:${id}`);
  const session = state.kind === 'ready' ? state.data : null;
  const unknown = remove.result?.kind === 'unknown';
  const conflict = remove.result?.kind === 'conflict';

  return <SleepPage title="Sleep Record" subtitle={session ? sleepDay(session.day) : undefined} fallback="/sleep/journal">
    {state.kind === 'loading' ? <SleepNotice title="Loading record" loading /> : null}
    {state.kind === 'error' ? <SleepNotice title="Could not load record" message={state.message} actionLabel="Try again" onAction={reload} error /> : null}
    {state.kind === 'ready' && !session ? <SleepNotice title="This record is no longer available" actionLabel="Open Journal"
      onAction={() => router.dismissTo('/sleep/journal')} /> : null}
    <SleepWriteNotice result={remove.result} reconcile={remove.reconcile} reload={() => { remove.clear(); reload(); }} />
    {session ? <>
      <SleepCard tone="mint">
        <ThemedText variant="heading">{session.sleepType === 'main' ? 'Main Sleep' : 'Nap'} · {sleepDuration(session.minutes)}</ThemedText>
        {session.method === 'range'
          ? <ThemedText variant="body">{session.start.day} {session.start.hour}:{session.start.minute} – {session.end.day} {session.end.hour}:{session.end.minute} ({session.timeZone})</ThemedText>
          : <ThemedText variant="body">Estimated duration · {sleepDay(session.day)}</ThemedText>}
        <ThemedText variant="label" themeColor="textSecondary">
          Feeling · {session.feeling ? session.feeling[0].toUpperCase() + session.feeling.slice(1) : 'Not provided'}
        </ThemedText>
      </SleepCard>
      <SleepButton label="Edit Record" onPress={() => router.push({ pathname: '/sleep/record', params: { id: session.id } })}
        variant="secondary" disabled={remove.busy || unknown || conflict} />
      <SleepButton label="Delete Record" onPress={() => setConfirmationRevision(session.revision)} variant="danger"
        disabled={unknown || conflict} busy={remove.busy} />
    </> : null}
    {confirmationRevision !== null ? <SleepConfirmation title="Delete this sleep record?"
      message="The record will be removed after confirmation." cancelLabel="Keep Record" confirmLabel="Confirm Delete"
      onCancel={() => setConfirmationRevision(null)} onConfirm={() => {
        setConfirmationRevision(null);
        remove.run({ kind: 'delete-session', id, revision: confirmationRevision });
      }} /> : null}
  </SleepPage>;
}
