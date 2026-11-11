import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, sizing, spacing } from '@/theme';
import type { Day } from '../types/sleep';
import { shiftDay } from '../utils/sleep-date';
import { sleepPeriod } from '../utils/sleep-format';

export function SleepWeekPicker({ week, currentWeek, onChange }: {
  week: Day; currentWeek: Day; onChange: (week: Day) => void;
}) {
  const theme = useTheme();
  return <View style={[styles.picker, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Previous week" onPress={() => onChange(shiftDay(week, -7))}
      style={({ pressed }) => [styles.arrow, { backgroundColor: pressed ? theme.backgroundSelected : 'transparent' }]}>
      <ThemedText variant="heading" themeColor="accent">‹</ThemedText>
    </Pressable>
    <ThemedText variant="labelStrong" accessibilityLiveRegion="polite" style={styles.period}>
      {sleepPeriod(week, shiftDay(week, 6))}
    </ThemedText>
    <Pressable accessibilityRole="button" accessibilityLabel="Next week" disabled={week >= currentWeek}
      accessibilityState={{ disabled: week >= currentWeek }} onPress={() => onChange(shiftDay(week, 7))}
      style={({ pressed }) => [styles.arrow, { opacity: week >= currentWeek ? 0.45 : 1, backgroundColor: pressed ? theme.backgroundSelected : 'transparent' }]}>
      <ThemedText variant="heading" themeColor="accent">›</ThemedText>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  picker: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.xl, padding: spacing.xs },
  arrow: { width: sizing.controlComfortable, height: sizing.controlComfortable, borderRadius: radius.full, justifyContent: 'center', alignItems: 'center' },
  period: { flex: 1, textAlign: 'center' },
});
