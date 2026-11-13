import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { spacing } from '@/theme';
import { sleepArt } from '../assets/sleep-art';
import { SleepConfirmation } from '../components/sleep-confirmation';
import { SleepButton, SleepCard, SleepNotice, SleepPage, SleepWriteNotice } from '../components/sleep-ui';
import { useSleepSessionMutation, useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import { sleepDay, sleepDuration } from '../utils/sleep-format';

export default function SleepRecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const repository = useSleepRepository();
  const { state, reload } = useSleepRead(() => repository.getSession(id), `sleep-session:${id}`);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const remove = useSleepSessionMutation(() => router.dismissTo('/sleep/journal'));
  const session = state.kind === 'ready' ? state.data : null;
  return <SleepPage title="Sleep Record"
    fallback="/sleep/journal" wellness wellnessHero>
    {state.kind === 'loading' ? <SleepNotice title="Loading record" loading /> : null}
    {state.kind === 'error' ? <SleepNotice title="Could not load record" message={state.message} actionLabel="Try again" onAction={reload} error /> : null}
    {state.kind === 'ready' && !session ? <SleepNotice title="This record is no longer available" message="It may have been removed from another device."
      actionLabel="Open Journal" onAction={() => router.dismissTo('/sleep/journal')} /> : null}
    <SleepWriteNotice result={remove.result} reload={() => {
      remove.clear();
      reload();
    }} />
    {session ? <>
      <SleepCard tone="mint">
        <View style={styles.summary}>
          <Image source={session.sleepType === 'main' ? sleepArt.bed : sleepArt.pillow}
            resizeMode="contain" accessible={false} style={styles.art} />
          <View style={styles.summaryText}>
            <ThemedText variant="labelStrong" themeColor="textSecondary">{session.sleepType === 'main' ? 'Main Sleep' : 'Nap'}</ThemedText>
            <ThemedText variant="metricLarge" themeColor="accent">{sleepDuration(session.minutes)}</ThemedText>
            <ThemedText variant="label" themeColor="textSecondary">{session.method === 'range' ? 'Start & End' : 'Duration only'}</ThemedText>
          </View>
        </View>
        {session.method === 'range' ? <>
          <DetailRow label="Sleep start" value={`${session.start.day} · ${session.start.hour}:${session.start.minute}`} />
          <DetailRow label="Wake time" value={`${session.end.day} · ${session.end.hour}:${session.end.minute}`} />
          <DetailRow label="Reference timezone" value={session.timeZone} />
        </> : null}
        <DetailRow label="Statistical day" value={sleepDay(session.day)} />
        {session.feeling ? <DetailRow label="Feeling" value={capitalize(session.feeling)} /> : null}
        <DetailRow label="Record status" value="Confirmed" status />
      </SleepCard>
      <ThemedText variant="caption" themeColor="textSecondary" style={styles.methodNote}>
        {session.method === 'range'
          ? 'Dates and times use the timezone saved with this record.'
          : 'Only the recorded duration and statistical day are available.'}
      </ThemedText>
      <View style={styles.actions}>
        <View style={styles.action}>
          <SleepButton label="Delete Record" onPress={() => setConfirmDelete(true)} variant="danger"
            disabled={remove.busy} busy={remove.busy} />
        </View>
        <View style={styles.action}>
          <SleepButton label="Edit Record" onPress={() => router.push({ pathname: '/sleep/record', params: { id: session.id } })}
            disabled={remove.busy} />
        </View>
      </View>
    </> : null}
    {confirmDelete && session ? <SleepConfirmation title="Delete this sleep record?"
      message="This confirmed record will be removed from your journal after you approve the deletion."
      cancelLabel="Keep Record" confirmLabel="Confirm Delete"
      onCancel={() => setConfirmDelete(false)} onConfirm={() => {
        setConfirmDelete(false);
        void remove.run({ kind: 'delete-session', id: session.id, revision: session.revision });
      }} /> : null}
  </SleepPage>;
}

function DetailRow({ label, value, status }: { label: string; value: string; status?: boolean }) {
  const theme = useTheme();
  return <View style={[styles.detailRow, { borderTopColor: theme.border }]}>
    <ThemedText variant="label" themeColor="textSecondary">{label}</ThemedText>
    <ThemedText variant="labelStrong" themeColor={status ? 'accent' : 'text'} style={styles.detailValue}>{value}</ThemedText>
  </View>;
}

function capitalize(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.xs },
  art: { width: 84, height: 84 },
  summaryText: { flex: 1, gap: spacing.xs },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.xs,
    paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  detailValue: { flexShrink: 1, textAlign: 'right' },
  methodNote: { paddingHorizontal: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { flex: 1, minWidth: 145 },
});
