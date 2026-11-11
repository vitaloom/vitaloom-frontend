import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, sizing, spacing } from '@/theme';
import { SleepConfirmation } from '../components/sleep-confirmation';
import { SleepButton, SleepCard, SleepNotice, SleepPage, SleepSegments, SleepWriteNotice } from '../components/sleep-ui';
import { useSleepMutation, useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import { sleepDay, sleepDuration } from '../utils/sleep-format';
import { validateGoal } from '../utils/sleep-validation';

const minuteOptions = ['00', '15', '30', '45'].map((value) => ({ value, label: value }));
type GoalDraft = { hours: string; minutes: string; revision: number };

export default function SleepGoalScreen() {
  const theme = useTheme();
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

  return <SleepPage title="Sleep Goal" subtitle="Choose a daily target">
    {state.kind === 'loading' ? <SleepNotice title="Loading your goal" loading /> : null}
    {state.kind === 'error' ? <SleepNotice title="Could not load goal" message={state.message} actionLabel="Try again" onAction={reload} error /> : null}
    {current && !current.verified ? <SleepNotice title="Goal history is unverified" actionLabel="Reload" onAction={reload} /> : null}
    <SleepWriteNotice result={save.result} reconcile={save.reconcile} reload={reloadGoal} />
    {current?.verified ? <>
      <SleepCard tone="mint">
        <ThemedText variant="label" themeColor="textSecondary">Current confirmed goal</ThemedText>
        <ThemedText variant="display">{current.minutes === null ? 'No active goal' : sleepDuration(current.minutes)}</ThemedText>
        <ThemedText variant="subhead" themeColor="textSecondary">
          {current.minutes === null ? 'Suggested goal · 8 hours per day'
            : current.effectiveDay ? `Effective since ${sleepDay(current.effectiveDay)}` : 'Daily target'}
        </ThemedText>
      </SleepCard>
      <SleepCard>
        <ThemedText variant="heading">{current.minutes === null ? 'Set a Sleep Goal' : 'Update Goal'}</ThemedText>
        <ThemedText variant="label">Hours · 1–24</ThemedText>
        <TextInput accessibilityLabel="Goal hours" keyboardType="number-pad" returnKeyType="done" maxLength={2}
          value={fields.hours} onChangeText={(hours) => setDraft({ ...fields, hours })}
          style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundElement }]} />
        <ThemedText variant="label">Minutes</ThemedText>
        <SleepSegments options={minuteOptions} value={fields.minutes} onChange={(value) => setDraft({ ...fields, minutes: value })} />
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
  input: { minHeight: sizing.controlComfortable, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.sm, fontSize: 17 },
});
