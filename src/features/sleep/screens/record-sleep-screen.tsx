import { useEffect, useState } from 'react';
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, sizing, spacing } from '@/theme';
import { sleepArt } from '../assets/sleep-art';
import { SleepConfirmation } from '../components/sleep-confirmation';
import { SleepRecordDateField, SleepRecordTimeField } from '../components/sleep-record-pickers';
import { SleepButton, SleepCard, SleepNotice, SleepPage, SleepSegments, SleepWriteNotice } from '../components/sleep-ui';
import { useSleepMutation, useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import type { CivilTime, Feeling, SleepContext, SleepDraft, SleepSession, SleepType } from '../types/sleep';
import { dayInZone, resolveCivil, shiftDay } from '../utils/sleep-date';
import { sleepDuration } from '../utils/sleep-format';
import { validateSession } from '../utils/sleep-validation';

const sleepTypes = [{ value: 'main', label: 'Main Sleep' }, { value: 'nap', label: 'Nap' }] as const;
const editSleepTypes = [
  { ...sleepTypes[0], art: sleepArt.bed },
  { ...sleepTypes[1], art: sleepArt.pillow },
] as const;
const methods = [{ value: 'range', label: 'Start & End Time' }, { value: 'duration', label: 'Duration Only' }] as const;
const feelings = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'normal', label: 'Normal' },
  { value: 'tired', label: 'Tired' },
] as const;

export default function RecordSleepScreen() {
  const repository = useSleepRepository();
  const context = repository.getContext();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const recordId = typeof id === 'string' ? id : null;
  const { state, reload } = useSleepRead(() => recordId
    ? repository.getSession(recordId)
    : Promise.resolve({ kind: 'ready', data: null }), `sleep-editor:${recordId ?? 'new'}`, true);
  const [editorKey, setEditorKey] = useState(0);

  if (!recordId) return <RecordForm key="new" context={context} />;
  const detail = { pathname: '/sleep/journal/[id]', params: { id: recordId } } as const;
  if (state.kind === 'loading') return <SleepPage title="Edit Sleep Record" fallback={detail} wellness>
    <SleepNotice title="Loading record" loading />
  </SleepPage>;
  if (state.kind === 'error') return <SleepPage title="Edit Sleep Record" fallback={detail} wellness>
    <SleepNotice title="Could not load this record" message={state.message} actionLabel="Retry" onAction={reload} error />
  </SleepPage>;
  if (!state.data) return <SleepPage title="Edit Sleep Record" fallback="/sleep/journal" wellness>
    <SleepNotice title="Record unavailable" message="This session may have been removed." actionLabel="Open Journal"
      onAction={() => router.dismissTo('/sleep/journal')} error />
  </SleepPage>;

  return <RecordForm key={`${recordId}:${editorKey}`} context={context} session={state.data} onReload={() => {
    setEditorKey((previous) => previous + 1);
    reload();
  }} />;
}

function RecordForm({ context, session, onReload }: { context: SleepContext; session?: SleepSession; onReload?: () => void }) {
  const [base] = useState(session);
  const [sleepType, setSleepType] = useState<SleepType>(base?.sleepType ?? 'main');
  const [method, setMethod] = useState<SleepDraft['method']>(base?.method ?? 'range');
  const [feeling, setFeeling] = useState<Feeling | null>(base?.feeling ?? null);
  const [timeZone, setTimeZone] = useState(base?.method === 'range' ? base.timeZone : context.timeZone);
  const [start, setStart] = useState<CivilTime>(base?.method === 'range' ? base.start
    : base ? { day: '', hour: '', minute: '' } : { day: shiftDay(context.today, -1), hour: '23', minute: '00' });
  const [end, setEnd] = useState<CivilTime>(base?.method === 'range' ? base.end
    : base ? { day: '', hour: '', minute: '' } : { day: context.today, hour: '07', minute: '00' });
  const [endDay, setEndDay] = useState(base?.day ?? context.today);
  const [hours, setHours] = useState(base?.method === 'duration' ? String(Math.floor(base.minutes / 60)) : '');
  const [minutes, setMinutes] = useState(base?.method === 'duration' ? String(base.minutes % 60).padStart(2, '0') : '');
  const [submitted, setSubmitted] = useState(false);
  const [exit, setExit] = useState<'saved' | 'discarded' | null>(null);
  const [discard, setDiscard] = useState<(() => void) | null>(null);

  const draft: SleepDraft = method === 'duration' ? { method, sleepType, feeling, endDay, hours, minutes }
    : { method, sleepType, feeling, timeZone, start, end };
  const now = new Date();
  const check = validateSession(draft, context, now, base);
  const dst = method === 'range' ? ([{ label: 'Start', time: start, set: setStart }, { label: 'End', time: end, set: setEnd }] as const)
    .flatMap(({ label, time, set }) => {
      const result = resolveCivil(time, timeZone);
      return result.kind === 'ambiguous' ? [{ label, options: result.options, choose: (offsetMinutes: number) => set({ ...time, offsetMinutes }) }] : [];
    }) : [];

  const recordId = base?.id;
  const detail = recordId ? { pathname: '/sleep/journal/[id]', params: { id: recordId } } as const : '/sleep';
  const mutation = useSleepMutation(() => setExit('saved'), recordId ? `sleep-session:${recordId}` : 'create-sleep-session');
  const stale = base?.revision !== session?.revision || (mutation.result?.kind === 'conflict' && mutation.result.reason !== 'overlap');
  const unknown = mutation.result?.kind === 'unknown';
  const locked = base?.method === 'range';
  const deleting = mutation.pendingKind === 'delete-session';
  const dirty = Boolean(base && (
    draft.sleepType !== base.sleepType || draft.feeling !== base.feeling || draft.method !== base.method ||
    (draft.method === 'range' && base.method === 'range' &&
      (draft.timeZone !== base.timeZone || !sameCivilTime(draft.start, base.start) || !sameCivilTime(draft.end, base.end))) ||
    (draft.method === 'duration' && base.method === 'duration' &&
      (draft.endDay !== base.day || draft.hours !== String(Math.floor(base.minutes / 60)) ||
        draft.minutes !== String(base.minutes % 60).padStart(2, '0')))
  ));
  usePreventRemove(Boolean(base && !exit && (dirty || (mutation.busy && !deleting))), ({ repeat }) => {
    if (!mutation.busy || deleting) setDiscard(() => repeat);
  });
  useEffect(() => {
    if (exit === 'saved') {
      router.dismissTo(recordId ? { pathname: '/sleep/journal/[id]', params: { id: recordId } } : '/sleep');
    }
  }, [exit, recordId]);

  function save() {
    setSubmitted(true);
    if (check.kind !== 'valid' || stale || unknown || deleting) return;
    mutation.run(base ? { kind: 'update-session', id: base.id, revision: base.revision, draft } : { kind: 'create-session', draft });
  }

  const typeControl = <SleepSegments options={base ? editSleepTypes : sleepTypes} value={sleepType} onChange={setSleepType} />;
  const methodControl = <>
    <ThemedText variant="bodyStrong">{base ? 'Entry Method' : 'Input Method'}</ThemedText>
    <SleepSegments options={methods} value={method} onChange={setMethod} />
  </>;
  const latestRangeDay = pickerDayInZone(now, timeZone, context.today);
  const rangeFields = <>
      <TimeFields label="Start" value={start} maximumDay={latestRangeDay} onChange={setStart} />
      <TimeFields label="Wake" value={end} maximumDay={latestRangeDay} onChange={setEnd} />
      <TimeZoneField label={locked ? 'Saved reference timezone' : 'Reference timezone · IANA name'} value={timeZone} editable={!locked}
        onChange={(text) => {
          setTimeZone(text);
          setStart((value) => ({ ...value, offsetMinutes: undefined }));
          setEnd((value) => ({ ...value, offsetMinutes: undefined }));
        }} />
      <ThemedText variant="caption" themeColor="textSecondary">
        {locked ? 'This record keeps its original timezone.' : 'Both times use this timezone. Example: Asia/Ho_Chi_Minh.'}
      </ThemedText>
  </>;
  const durationDate = <SleepRecordDateField label="End date" day={endDay} maximumDay={context.today} onChange={setEndDay} />;
  const durationFields = <SleepRecordTimeField label="Sleep duration" hours={hours} minutes={minutes} duration
    onChange={(nextHours, nextMinutes) => { setHours(nextHours); setMinutes(nextMinutes); }} />;
  const feelingPicker = <FeelingPicker value={feeling} onChange={setFeeling} />;
  const saveButton = <SleepButton label={base ? 'Save Changes' : 'Save Sleep Record'} onPress={save}
    disabled={stale || unknown || deleting} busy={mutation.busy && !deleting} />;

  return <SleepPage title={base ? 'Edit Sleep Record' : 'Record Sleep'} fallback={detail} hero={!base}
    wellness={Boolean(base)} wellnessHero={Boolean(base)}>
    {base ? <SleepCard>
      <ThemedText variant="bodyStrong">Sleep Type</ThemedText>
      {typeControl}
    </SleepCard> : typeControl}
    {base ? <SleepCard>{methodControl}{method === 'range' ? rangeFields : <>{durationDate}{durationFields}</>}</SleepCard>
      : <>{methodControl}{method === 'range' ? <SleepCard>{rangeFields}</SleepCard> : <>
        <SleepCard>{durationDate}</SleepCard>
        <SleepCard><ThemedText variant="heading">Duration</ThemedText>{durationFields}</SleepCard>
      </>}</>}
    {dst.map(({ label, options, choose }) => <SleepCard key={label} tone="mint">
      <ThemedText variant="bodyStrong">{label} time occurs twice</ThemedText>
      <ThemedText variant="subhead">Choose the correct UTC offset for this time.</ThemedText>
      <View style={styles.row}>
        {options.map((offset) => <SleepButton key={offset} label={formatOffset(offset)} onPress={() => choose(offset)} variant="secondary" />)}
      </View>
    </SleepCard>)}
    <SleepCard tone="mint">
      <ThemedText variant="label" themeColor="textSecondary">{method === 'range' ? 'Sleep Duration · calculated' : 'Sleep Duration · estimated'}</ThemedText>
      <ThemedText variant={check.kind === 'valid' ? 'display' : 'subhead'}>
        {check.kind === 'valid' ? sleepDuration(check.value.minutes) : 'Enter a valid sleep duration'}
      </ThemedText>
    </SleepCard>
    {base ? <SleepCard>{feelingPicker}</SleepCard> : feelingPicker}
    {submitted && check.kind === 'validation' ? <SleepNotice title="Check sleep details" message={check.message} error /> : null}
    {stale && !mutation.result ? <SleepNotice title="This record changed" message="Reload the confirmed record to start a new edit."
      actionLabel="Reload confirmed record" onAction={onReload} error /> : null}
    {deleting ? <SleepNotice title="Deletion is pending" message="Check the outcome on the record before saving changes."
      actionLabel="Open record" onAction={() => router.dismissTo(detail)} />
      : <SleepWriteNotice result={mutation.result} reconcile={mutation.reconcile} reload={onReload} />}
    {base ? <View style={styles.row}>
      <View style={styles.action}><SleepButton label="Cancel" variant="secondary" disabled={mutation.busy && !deleting}
        onPress={() => router.dismissTo(detail)} /></View>
      <View style={styles.action}>{saveButton}</View>
    </View> : saveButton}
    {discard ? <SleepConfirmation title="Discard changes?" message="Your unsaved edits will be lost."
      cancelLabel="Keep Editing" confirmLabel="Discard Changes" onCancel={() => setDiscard(null)} onConfirm={() => {
        setExit('discarded');
        setDiscard(null);
        discard();
      }} /> : null}
  </SleepPage>;
}

function sameCivilTime(first: CivilTime, second: CivilTime) {
  return first.day === second.day && first.hour === second.hour && first.minute === second.minute &&
    first.offsetMinutes === second.offsetMinutes;
}

function pickerDayInZone(now: Date, timeZone: string, fallback: string) {
  try {
    return dayInZone(now, timeZone);
  } catch {
    return fallback;
  }
}

function TimeFields({ label, value, maximumDay, onChange }: {
  label: string;
  value: CivilTime;
  maximumDay: string;
  onChange: (value: CivilTime) => void;
}) {
  return <View style={styles.fields}>
    <ThemedText variant="bodyStrong">{label}</ThemedText>
    <SleepRecordDateField label={`${label} date`} day={value.day} maximumDay={maximumDay}
      onChange={(day) => { if (day !== value.day) onChange({ ...value, day, offsetMinutes: undefined }); }} />
    <SleepRecordTimeField label={`${label} time`} hours={value.hour} minutes={value.minute}
      onChange={(hour, minute) => {
        if (hour !== value.hour.padStart(2, '0') || minute !== value.minute.padStart(2, '0')) {
          onChange({ ...value, hour, minute, offsetMinutes: undefined });
        } else if (!value.hour || !value.minute) {
          onChange({ ...value, hour, minute });
        }
      }} />
  </View>;
}

function TimeZoneField({ label, value, onChange, editable }: {
  label: string; value: string; onChange: (value: string) => void; editable: boolean;
}) {
  const theme = useTheme();
  return <View style={styles.field}>
    <ThemedText variant="label">{label}</ThemedText>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={editable}
      autoCapitalize="none" autoCorrect={false} returnKeyType="done"
      style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: editable ? theme.backgroundElement : theme.backgroundSelected }]} />
  </View>;
}

function FeelingPicker({ value, onChange }: { value: Feeling | null; onChange: (feeling: Feeling | null) => void }) {
  const theme = useTheme();
  return <View style={styles.fields}>
    <ThemedText variant="bodyStrong">How did you feel? · Optional</ThemedText>
    <View style={styles.row}>
      {feelings.map(({ value: feeling, label }) => <Pressable key={feeling} accessibilityRole="button"
        accessibilityState={{ selected: value === feeling }} onPress={() => onChange(value === feeling ? null : feeling)}
        style={({ pressed }) => [styles.feeling, {
          backgroundColor: value === feeling || pressed ? theme.stepsSoft : theme.backgroundElement,
          borderColor: value === feeling ? theme.accent : theme.border,
        }]}>
        <Image source={sleepArt[feeling]} resizeMode="contain" style={styles.reaction} accessible={false} />
        <ThemedText variant="label" style={styles.center}>{label}</ThemedText>
      </Pressable>)}
    </View>
    <Pressable accessibilityRole="button" accessibilityState={{ selected: value === null }} onPress={() => onChange(null)}
      style={styles.clear}><ThemedText variant="label" themeColor={value === null ? 'accent' : 'textSecondary'}>Not provided</ThemedText></Pressable>
  </View>;
}

function formatOffset(offset: number) {
  const absoluteSeconds = Math.round(Math.abs(offset) * 60);
  const hours = String(Math.floor(absoluteSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor(absoluteSeconds / 60) % 60).padStart(2, '0');
  const seconds = absoluteSeconds % 60;
  const suffix = seconds ? `:${String(seconds).padStart(2, '0')}` : '';
  return `UTC${offset < 0 ? '−' : '+'}${hours}:${minutes}${suffix}`;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { flexGrow: 1, flexBasis: 128 },
  fields: { gap: spacing.sm },
  field: { flexGrow: 1, flexBasis: 98, gap: spacing.xs },
  input: { minHeight: sizing.controlComfortable, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.sm, fontSize: 16 },
  feeling: { flexGrow: 1, flexBasis: 78, minHeight: 74, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, borderWidth: 1, padding: spacing.sm },
  reaction: { width: 42, height: 42 },
  center: { textAlign: 'center' },
  clear: { minHeight: sizing.controlComfortable, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: spacing.sm },
});
