import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, sizing, spacing } from '@/theme';
import type { Day } from '../types/sleep';
import { sleepDay } from '../utils/sleep-format';
import { SleepCalendarPicker } from './sleep-calendar-picker';
import { SleepNumberWheel } from './sleep-number-wheel';
import { SleepPickerDialog } from './sleep-picker-dialog';
import { SleepButton } from './sleep-ui';

const clockHours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const durationHours = Array.from({ length: 25 }, (_, index) => String(index));
const minuteOptions = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));

export function SleepRecordDateField({ label, day, maximumDay, minimumDay, disabledDays, onChange }: {
  label: string;
  day: Day;
  maximumDay: Day;
  minimumDay?: Day;
  disabledDays?: Day[];
  onChange: (day: Day) => void;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <PickerField label={label} value={day ? sleepDay(day) : 'Choose date'} onPress={() => setOpen(true)} />
    {open ? <SleepCalendarPicker title={label} selected={day || null} anchor={maximumDay} maximumDay={maximumDay}
      minimumDay={minimumDay} disabledDays={disabledDays}
      onSelect={(nextDay) => { onChange(nextDay); setOpen(false); }} onClose={() => setOpen(false)} /> : null}
  </>;
}

export function SleepRecordTimeField({ label, hours, minutes, duration, onChange }: {
  label: string;
  hours: string;
  minutes: string;
  duration?: boolean;
  onChange: (hours: string, minutes: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const value = hours && minutes ? duration ? `${hours}h ${minutes.padStart(2, '0')}m`
    : `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}` : duration ? 'Choose duration' : 'Choose time';
  return <>
    <PickerField label={label} value={value} onPress={() => setOpen(true)} />
    {open ? <TimePicker title={label} hours={hours} minutes={minutes} duration={duration} onClose={() => setOpen(false)}
      onSelect={(nextHours, nextMinutes) => { onChange(nextHours, nextMinutes); setOpen(false); }} /> : null}
  </>;
}

function TimePicker({ title, hours, minutes, duration, onClose, onSelect }: {
  title: string;
  hours: string;
  minutes: string;
  duration?: boolean;
  onClose: () => void;
  onSelect: (hours: string, minutes: string) => void;
}) {
  const [selectedHours, setHours] = useState(duration ? String(Number(hours)) : hours.padStart(2, '0'));
  const [selectedMinutes, setMinutes] = useState(minutes.padStart(2, '0'));
  return <SleepPickerDialog title={title} onClose={onClose}>
    <View style={styles.wheels}>
      <SleepNumberWheel label="Hours" accessibilityLabel={`${title} hours`} values={duration ? durationHours : clockHours}
        value={selectedHours} onChange={setHours} />
      <SleepNumberWheel label="Minutes" accessibilityLabel={`${title} minutes`} values={minuteOptions}
        value={selectedMinutes} onChange={setMinutes} />
    </View>
    <SleepButton label={duration ? 'Use duration' : 'Use time'} onPress={() => onSelect(selectedHours, selectedMinutes)} />
  </SleepPickerDialog>;
}

function PickerField({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const theme = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${value}`}
    onPress={() => { Keyboard.dismiss(); onPress(); }}
    style={({ pressed }) => [styles.field, { borderColor: theme.border, backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement }]}>
    <View style={styles.fieldText}>
      <ThemedText variant="caption" themeColor="textSecondary">{label}</ThemedText>
      <ThemedText variant="labelStrong">{value}</ThemedText>
    </View>
    <ThemedText variant="heading" themeColor="accent">›</ThemedText>
  </Pressable>;
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, borderWidth: 1,
    minHeight: sizing.controlComfortable, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  fieldText: { flex: 1, minWidth: 0 },
  wheels: { flexDirection: 'row', gap: spacing.md },
});
