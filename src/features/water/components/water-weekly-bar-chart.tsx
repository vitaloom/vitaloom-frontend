import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { radius, sizing, spacing } from '@/theme';
import type { Theme, WeeklyWaterSummary, LocalDate } from '../types/water';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WaterWeeklyBarChart({ summary, selectedDate, today, onSelect, theme }: { summary: WeeklyWaterSummary; selectedDate: LocalDate; today: LocalDate; onSelect: (date: LocalDate) => void; theme: Theme }) {
  const maxMl = Math.max(2000, ...summary.days.map((day) => day.totalMl));
  return <View style={{ padding: spacing.md, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, gap: spacing.md }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><ThemedText variant="heading">This week</ThemedText><ThemedText variant="caption" themeColor="textSecondary">Monday – Sunday</ThemedText></View>
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs }}>{summary.days.map((day, index) => {
      const disabled = day.date > today;
      const selected = day.date === selectedDate;
      const height = day.totalMl > 0 ? Math.max(12, (day.totalMl / maxMl) * 112) : 6;
      return <Pressable key={day.date} onPress={() => onSelect(day.date)} disabled={disabled} accessibilityRole="button" accessibilityLabel={`${DAY_LABELS[index]} ${day.date}, ${day.totalMl} millilitres`} accessibilityState={{ disabled, selected }} style={({ pressed }) => ({ flex: 1, minHeight: 184, alignItems: 'center', justifyContent: 'flex-end', gap: spacing.xs, opacity: disabled ? 0.35 : pressed ? 0.65 : 1 })}>
        <ThemedText variant="caption" themeColor={selected ? 'accent' : 'textSecondary'} style={{ textAlign: 'center' }}>{day.totalMl ? `${(day.totalMl / 1000).toFixed(1)}L` : '0'}</ThemedText>
        <View style={{ height, width: '100%', borderRadius: radius.md, backgroundColor: selected ? theme.accent : theme.accentSoft }} />
        <View style={{ minHeight: sizing.controlMin, minWidth: sizing.controlMin, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: selected ? theme.backgroundSelected : 'transparent' }}><ThemedText variant="labelStrong" themeColor={selected ? 'accent' : 'textSecondary'}>{DAY_LABELS[index]}</ThemedText></View>
      </Pressable>;
    })}</View>
    <ThemedText variant="caption" themeColor="textSecondary" style={{ textAlign: 'center' }}>Select a day to see its water logs.</ThemedText>
  </View>;
}
