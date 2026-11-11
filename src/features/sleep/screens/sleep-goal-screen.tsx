import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { spacing } from '@/theme';
import { SleepConfirmation } from '../components/sleep-confirmation';
import { SleepGoalPicker } from '../components/sleep-goal-picker';
import { SleepButton, SleepCard, SleepNotice, SleepPage, SleepWriteNotice } from '../components/sleep-ui';
import { sleepArt } from '../assets/sleep-art';
import { useSleepMutation, useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import { sleepDay, sleepDuration } from '../utils/sleep-format';
import { validateGoal } from '../utils/sleep-validation';

type GoalDraft = { hours: string; minutes: string; revision: number };

export default function SleepGoalScreen() {
  const repository = useSleepRepository();
  const { today } = repository.getContext();
  const { state, reload } = useSleepRead(() => repository.getGoal(today), `sleep-goal:${today}`, true);
  const [draft, setDraft] = useState<GoalDraft>();
  const [submitted, setSubmitted] = useState(false);
  const [confirmationRevision, setConfirmationRevision] = useState<number | null>(null);
  const save = useSleepMutation(() => {
    setDraft(undefined);
    setSubmitted(false);
    reload();
  }, 'sleep-goal');
  const current = state.kind === 'ready' ? state.data : null;
  const minutes = current?.minutes ?? 480;
  const fields = draft ?? {
    hours: String(Math.floor(minutes / 60)), minutes: String(minutes % 60).padStart(2, '0'), revision: current?.revision ?? 0,
  };
  const check = validateGoal(fields.hours, fields.minutes);
  const stale = (draft && current?.revision !== draft.revision) || save.result?.kind === 'conflict';
  const unknown = save.result?.kind === 'unknown';

  function reloadGoal() {
    setDraft(undefined);
    setSubmitted(false);
    save.clear();
    reload();
  }

  return <SleepPage title="Sleep Goal" subtitle="Choose a daily target" wellness wellnessHero>
    {state.kind === 'loading' ? <SleepNotice title="Loading your goal" loading /> : null}
    {state.kind === 'error' ? <SleepNotice title="Could not load goal" message={state.message} actionLabel="Try again" onAction={reload} error /> : null}
    {current && !current.verified ? <SleepNotice title="Goal history is unverified" actionLabel="Reload" onAction={reload} /> : null}
    <SleepWriteNotice result={save.result} reconcile={save.reconcile} reload={reloadGoal} />
    {current?.verified ? <>
      <SleepCard tone="mint">
        <View style={styles.summary}>
          <Image accessible={false} source={sleepArt.bed} resizeMode="contain" style={styles.bed} />
          <View style={styles.summaryText}>
            <ThemedText variant="label" themeColor="textSecondary">Current confirmed goal</ThemedText>
            <ThemedText variant="heading">{current.minutes === null ? 'No active goal' : sleepDuration(current.minutes)}</ThemedText>
            <ThemedText variant="caption" themeColor="textSecondary">
              {current.minutes === null ? 'Suggested 8 hours per day. Save to activate it.'
                : current.effectiveDay ? `Effective since ${sleepDay(current.effectiveDay)}` : 'Daily target'}
            </ThemedText>
          </View>
        </View>
      </SleepCard>
      <SleepCard>
        <ThemedText variant="heading">{current.minutes === null ? 'Set a Sleep Goal' : 'Update Goal'}</ThemedText>
        <SleepGoalPicker hours={fields.hours} minutes={fields.minutes}
          onHoursChange={(hours) => setDraft({ ...fields, hours })}
          onMinutesChange={(minutes) => setDraft({ ...fields, minutes })} />
        <ThemedText variant="caption" themeColor="textSecondary">Hours range from 1 to 24. Minutes use 00, 15, 30 or 45. At 24 hours, minutes must be 00.</ThemedText>
        {submitted && check.kind === 'validation' ? <ThemedText accessibilityRole="alert" variant="label" themeColor="danger">{check.message}</ThemedText> : null}
        <SleepButton label="Save Goal" disabled={Boolean(stale || unknown)} busy={save.busy} onPress={() => {
          setSubmitted(true);
          if (check.kind === 'valid') save.run({ kind: 'set-goal', ...fields });
        }} />
      </SleepCard>
      {stale && !save.result ? <SleepNotice title="This goal changed" message="Reload to start a new edit."
        actionLabel="Reload confirmed goal" onAction={reloadGoal} /> : null}
      {current.minutes !== null ? <SleepButton label="Remove Goal" onPress={() => setConfirmationRevision(current.revision)}
        variant="danger" disabled={Boolean(stale || unknown || save.busy)} /> : null}
    </> : null}
    {confirmationRevision !== null ? <SleepConfirmation title="Remove this goal?"
      message="The goal will end on the confirmed effective day. Earlier days keep their historical goals."
      cancelLabel="Keep Goal" confirmLabel="Confirm Removal" onCancel={() => setConfirmationRevision(null)} onConfirm={() => {
        setConfirmationRevision(null);
        save.run({ kind: 'remove-goal', revision: confirmationRevision });
      }} /> : null}
  </SleepPage>;
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bed: { width: 88, height: 72 },
  summaryText: { flex: 1, minWidth: 0, gap: spacing.xs },
});
