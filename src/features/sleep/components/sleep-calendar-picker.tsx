import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, sizing, spacing } from '@/theme';
import type { Day } from '../types/sleep';
import { calendarMonthDays, calendarMonthStart, shiftCalendarMonth } from '../utils/sleep-calendar';
import { SleepPickerDialog } from './sleep-picker-dialog';

const weekdays = [
  { short: 'Mon', full: 'Monday' },
  { short: 'Tue', full: 'Tuesday' },
  { short: 'Wed', full: 'Wednesday' },
  { short: 'Thu', full: 'Thursday' },
  { short: 'Fri', full: 'Friday' },
  { short: 'Sat', full: 'Saturday' },
  { short: 'Sun', full: 'Sunday' },
] as const;

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export function SleepCalendarPicker({ title, selected, anchor, maximumDay, minimumDay, disabledDays, onSelect, onClose, onClear }: {
  title: string;
  selected: Day | null;
  anchor: Day;
  maximumDay?: Day;
  minimumDay?: Day;
  disabledDays?: Day[];
  onSelect: (day: Day) => void;
  onClose: () => void;
  onClear?: () => void;
}) {
  const theme = useTheme();
  const [month, setMonth] = useState(() => calendarMonthStart(selected ?? anchor));
  const days = useMemo(() => calendarMonthDays(month), [month]);
  const nextMonth = shiftCalendarMonth(month, 1);
  const previousMonth = shiftCalendarMonth(month, -1);
  const latestMonth = maximumDay ? calendarMonthStart(maximumDay) : null;
  const nextDisabled = !nextMonth || Boolean(latestMonth && nextMonth > latestMonth);
  const monthDate = new Date(`${month}T00:00:00Z`);
  const label = monthFormatter.format(monthDate);

  return <SleepPickerDialog title={title} onClose={onClose}>
    <View style={styles.calendar}>
      <View style={styles.monthNavigation}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" disabled={!previousMonth}
          accessibilityState={{ disabled: !previousMonth }} onPress={() => previousMonth && setMonth(previousMonth)}
          style={({ pressed }) => [styles.monthButton, { backgroundColor: pressed ? theme.backgroundSelected : 'transparent', opacity: previousMonth ? 1 : 0.4 }]}>
          <ThemedText variant="heading" themeColor="accent">‹</ThemedText>
        </Pressable>
        <ThemedText accessibilityLiveRegion="polite" variant="bodyStrong" style={styles.monthLabel}>{label}</ThemedText>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" disabled={nextDisabled}
          accessibilityState={{ disabled: nextDisabled }} onPress={() => nextMonth && setMonth(nextMonth)}
          style={({ pressed }) => [styles.monthButton, { backgroundColor: pressed ? theme.backgroundSelected : 'transparent', opacity: nextDisabled ? 0.4 : 1 }]}>
          <ThemedText variant="heading" themeColor="accent">›</ThemedText>
        </Pressable>
      </View>

      <View accessibilityRole="none" style={styles.weekdays}>
        {weekdays.map(day => <ThemedText key={day.short} variant="caption" themeColor="textSecondary"
          accessibilityLabel={day.full} style={styles.weekday}>{day.short}</ThemedText>)}
      </View>

      <View style={styles.days}>
        {days.map((day, index) => {
          if (!day) return <View key={`blank-${index}`} accessible={false} style={styles.dayBlank} />;
          const isSelected = day === selected;
          const isAnchor = day === anchor;
          const disabled = Boolean((maximumDay && day > maximumDay) || (minimumDay && day < minimumDay)
            || disabledDays?.includes(day));
          const dateNumber = Number(day.slice(-2));
          const backgroundColor = isSelected ? theme.accent : isAnchor ? theme.backgroundSelected : 'transparent';
          const foreground = isSelected ? 'onAccent' : isAnchor ? 'accent' : 'text';
          return <Pressable key={day} accessibilityRole="button" accessibilityLabel={isAnchor ? `${day}, today` : day}
            accessibilityState={{ selected: isSelected, disabled }} disabled={disabled} onPress={() => onSelect(day)}
            style={({ pressed }) => [styles.dayButton, { backgroundColor, borderColor: isAnchor && !isSelected ? theme.accent : 'transparent',
              opacity: disabled ? 0.35 : pressed ? 0.65 : 1 }]}>
            <ThemedText variant="labelStrong" themeColor={foreground}>{dateNumber}</ThemedText>
          </Pressable>;
        })}
      </View>

      {onClear ? <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onClear} style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.65 : 1 }]}>
          <ThemedText variant="labelStrong" themeColor="accent">All dates</ThemedText>
        </Pressable>
      </View> : null}
    </View>
  </SleepPickerDialog>;
}

const styles = StyleSheet.create({
  calendar: { width: '100%', gap: spacing.sm },
  monthNavigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthButton: { width: sizing.controlComfortable, height: sizing.controlComfortable, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  monthLabel: { flex: 1, textAlign: 'center' },
  weekdays: { flexDirection: 'row' },
  weekday: { width: '14.2857%', minHeight: sizing.controlMin, textAlign: 'center', textAlignVertical: 'center' },
  days: { flexDirection: 'row', flexWrap: 'wrap' },
  dayBlank: { width: '14.2857%', height: sizing.controlMin },
  dayButton: { width: '14.2857%', height: sizing.controlMin, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, borderWidth: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, paddingTop: spacing.xs },
  actionButton: { minHeight: sizing.controlComfortable, justifyContent: 'center', paddingHorizontal: spacing.sm },
});
