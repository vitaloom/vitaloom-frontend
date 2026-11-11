import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, sizing, spacing } from '@/theme';
import type { Day } from '../types/sleep';
import { shiftDay, startOfWeek } from '../utils/sleep-date';
import { sleepPeriod } from '../utils/sleep-format';
import { SleepCalendarPicker } from './sleep-calendar-picker';

export function SleepWeekPicker({ week, today, onChange }: {
  week: Day; today: Day; onChange: (week: Day) => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const currentWeek = startOfWeek(today);
  const canGoBack = week > '0001-01-01';
  const period = sleepPeriod(week, shiftDay(week, 6));
  return <>
    <View style={[styles.picker, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous week" disabled={!canGoBack}
        accessibilityState={{ disabled: !canGoBack }} onPress={() => onChange(shiftDay(week, -7))}
        style={({ pressed }) => [styles.arrow, { opacity: canGoBack ? 1 : 0.45, backgroundColor: pressed ? theme.backgroundSelected : 'transparent' }]}>
        <ThemedText variant="heading" themeColor="accent">‹</ThemedText>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Choose week, ${period}`} accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.periodButton, { backgroundColor: pressed ? theme.backgroundSelected : 'transparent' }]}>
        <ThemedText variant="labelStrong" accessibilityLiveRegion="polite" style={styles.period}>{period}</ThemedText>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Next week" disabled={week >= currentWeek}
        accessibilityState={{ disabled: week >= currentWeek }} onPress={() => onChange(shiftDay(week, 7))}
        style={({ pressed }) => [styles.arrow, { opacity: week >= currentWeek ? 0.45 : 1, backgroundColor: pressed ? theme.backgroundSelected : 'transparent' }]}>
        <ThemedText variant="heading" themeColor="accent">›</ThemedText>
      </Pressable>
    </View>
    {open ? <SleepCalendarPicker title="Choose a date in the week" selected={week} anchor={today} maximumDay={today}
      onSelect={(day) => {
        const nextWeek = startOfWeek(day);
        if (nextWeek !== week) onChange(nextWeek);
        setOpen(false);
      }} onClose={() => setOpen(false)} /> : null}
  </>;
}

const styles = StyleSheet.create({
  picker: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.xl, padding: spacing.xs },
  arrow: { width: sizing.controlComfortable, height: sizing.controlComfortable, borderRadius: radius.full, justifyContent: 'center', alignItems: 'center' },
  periodButton: { flex: 1, minHeight: sizing.controlComfortable, justifyContent: 'center', borderRadius: radius.md, paddingVertical: spacing.xs },
  period: { textAlign: 'center' },
});
