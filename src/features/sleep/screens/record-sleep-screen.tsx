import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, sizing, spacing } from '@/theme';
import { sleepArt } from '../assets/sleep-art';
import { SleepButton, SleepCard, SleepNotice, SleepPage, SleepSegments, SleepWriteNotice } from '../components/sleep-ui';
import { useSleepMutation, useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import type { CivilTime, Feeling, SleepContext, SleepDraft, SleepSession, SleepType } from '../types/sleep';
import { resolveCivil, shiftDay } from '../utils/sleep-date';
import { sleepDuration } from '../utils/sleep-format';
import { validateSession } from '../utils/sleep-validation';

const sleepTypes = [{ value: 'main', label: 'Main Sleep' }, { value: 'nap', label: 'Nap' }] as const;
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
  if (state.kind === 'loading') return <SleepPage title="Edit Sleep"><SleepNotice title="Loading record" loading /></SleepPage>;
  if (state.kind === 'error') return <SleepPage title="Edit Sleep">
    <SleepNotice title="Could not load this record" message={state.message} actionLabel="Retry" onAction={reload} error />
  </SleepPage>;
  if (!state.data) return <SleepPage title="Edit Sleep">
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

  const draft: SleepDraft = method === 'duration' ? { method, sleepType, feeling, endDay, hours, minutes }
    : { method, sleepType, feeling, timeZone, start, end };
  const check = validateSession(draft, context, new Date(), base);
  const dst = method === 'range' ? ([{ label: 'Start', time: start, set: setStart }, { label: 'End', time: end, set: setEnd }] as const)
    .flatMap(({ label, time, set }) => {
      const result = resolveCivil(time, timeZone);
      return result.kind === 'ambiguous' ? [{ label, options: result.options, choose: (offsetMinutes: number) => set({ ...time, offsetMinutes }) }] : [];
    }) : [];

  const mutation = useSleepMutation((result) => {
    if (base) router.dismissTo({ pathname: '/sleep/journal/[id]', params: { id: result.recordId ?? base.id } });
    else router.dismissTo('/sleep');
  }, `sleep-session:${base?.id ?? 'new'}`);
  const stale = base?.revision !== session?.revision || (mutation.result?.kind === 'conflict' && mutation.result.reason !== 'overlap');
  const unknown = mutation.result?.kind === 'unknown';
  const locked = base?.method === 'range';

  function save() {
    setSubmitted(true);
    if (check.kind !== 'valid' || stale || unknown) return;
    mutation.run(base ? { kind: 'update-session', id: base.id, revision: base.revision, draft } : { kind: 'create-session', draft });
  }

  return <SleepPage title={base ? 'Edit Sleep' : 'Record Sleep'} fallback={base ? '/sleep/journal' : '/sleep'} hero>
    <SleepSegments options={sleepTypes} value={sleepType} onChange={setSleepType} />
    <ThemedText variant="bodyStrong">Input Method</ThemedText>
    <SleepSegments options={methods} value={method} onChange={setMethod} />
    {method === 'range' ? <SleepCard>
      <TimeFields label="Start" value={start} onChange={setStart} />
      <TimeFields label="End" value={end} onChange={setEnd} />
      <Field label={locked ? 'Saved reference timezone' : 'Reference timezone · IANA name'} value={timeZone} editable={!locked}
        onChange={(text) => {
          setTimeZone(text);
          setStart((value) => ({ ...value, offsetMinutes: undefined }));
          setEnd((value) => ({ ...value, offsetMinutes: undefined }));
        }} />
      <ThemedText variant="caption" themeColor="textSecondary">
        {locked ? 'This record keeps its original timezone.' : 'Both times use this timezone. Example: Asia/Ho_Chi_Minh.'}
      </ThemedText>
    </SleepCard> : <>
      <SleepCard><Field label="End date · YYYY-MM-DD" value={endDay} onChange={setEndDay} /></SleepCard>
      <SleepCard>
        <ThemedText variant="heading">Duration</ThemedText>
        <View style={styles.row}>
          <Field label="Hours · 0–24" value={hours} onChange={setHours} numeric />
          <Field label="Minutes · 0–59" value={minutes} onChange={setMinutes} numeric />
        </View>
      </SleepCard>
    </>}
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
    <FeelingPicker value={feeling} onChange={setFeeling} />
    {submitted && check.kind === 'validation' ? <SleepNotice title="Check sleep details" message={check.message} error /> : null}
    {stale && !mutation.result ? <SleepNotice title="This record changed" message="Reload the confirmed record to start a new edit."
      actionLabel="Reload confirmed record" onAction={onReload} error /> : null}
    <SleepWriteNotice result={mutation.result} reconcile={mutation.reconcile} reload={onReload} />
    <SleepButton label={base ? 'Save Changes' : 'Save Sleep Record'} onPress={save} disabled={stale || unknown} busy={mutation.busy} />
  </SleepPage>;
}

function TimeFields({ label, value, onChange }: { label: string; value: CivilTime; onChange: (value: CivilTime) => void }) {
  return <View style={styles.fields}>
    <ThemedText variant="bodyStrong">{label}</ThemedText>
    <Field label={`${label} date · YYYY-MM-DD`} value={value.day} onChange={(day) => onChange({ ...value, day, offsetMinutes: undefined })} />
    <View style={styles.row}>
      <Field label={`${label} hour · 00–23`} value={value.hour} onChange={(hour) => onChange({ ...value, hour, offsetMinutes: undefined })} numeric />
      <Field label={`${label} minute · 00–59`} value={value.minute} onChange={(minute) => onChange({ ...value, minute, offsetMinutes: undefined })} numeric />
    </View>
  </View>;
}

function Field({ label, value, onChange, numeric, editable = true }: {
  label: string; value: string; onChange: (value: string) => void; numeric?: boolean; editable?: boolean;
}) {
  const theme = useTheme();
  return <View style={styles.field}>
    <ThemedText variant="label">{label}</ThemedText>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={editable}
      keyboardType={numeric ? 'number-pad' : 'default'} maxLength={numeric ? 2 : undefined}
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
  fields: { gap: spacing.sm },
  field: { flexGrow: 1, flexBasis: 98, gap: spacing.xs },
  input: { minHeight: sizing.controlComfortable, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.sm, fontSize: 16 },
  feeling: { flexGrow: 1, flexBasis: 78, minHeight: 74, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, borderWidth: 1, padding: spacing.sm },
  reaction: { width: 42, height: 42 },
  center: { textAlign: 'center' },
  clear: { minHeight: sizing.controlComfortable, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: spacing.sm },
});
