import { StyleSheet, View } from 'react-native';
import { spacing } from '@/theme';
import { SleepNumberWheel } from './sleep-number-wheel';

const hourValues = Array.from({ length: 24 }, (_, index) => String(index + 1));
const minuteValues = ['00', '15', '30', '45'];

export function SleepGoalPicker({ hours, minutes, onHoursChange, onMinutesChange }: {
  hours: string;
  minutes: string;
  onHoursChange: (value: string) => void;
  onMinutesChange: (value: string) => void;
}) {
  return <View style={styles.pickers}>
    <SleepNumberWheel label="Hours" accessibilityLabel="Goal hours" values={hourValues} value={hours} onChange={onHoursChange} />
    <SleepNumberWheel label="Minutes" accessibilityLabel="Goal minutes" values={minuteValues} value={minutes} onChange={onMinutesChange} />
  </View>;
}

const styles = StyleSheet.create({
  pickers: { flexDirection: 'row', gap: spacing.md },
});
