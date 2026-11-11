import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useI18n, useTranslations } from '@/i18n';
import { radius, sizing, spacing } from '@/theme';
import type { Theme, WeeklyWaterSummary, LocalDate } from '../types/water';
import { waterMessages } from '../messages';

export function WaterWeeklyBarChart({ summary, selectedDate, today, onSelect, theme }: { summary: WeeklyWaterSummary; selectedDate: LocalDate; today: LocalDate; onSelect: (date: LocalDate) => void; theme: Theme }) {
  const { locale } = useI18n();
  const t = useTranslations(waterMessages);
  const dayLabels = t('dayNames').split(',');
  const maxMl = Math.max(2000, ...summary.days.map((day) => day.totalMl));
  return <View style={{ padding: spacing.md, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, gap: spacing.md }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><ThemedText variant="heading">{t('thisWeek')}</ThemedText><ThemedText variant="caption" themeColor="textSecondary">{t('mondaySunday')}</ThemedText></View>
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs }}>{summary.days.map((day, index) => {
      const disabled = day.date > today;
      const selected = day.date === selectedDate;
      const height = day.totalMl > 0 ? Math.max(12, (day.totalMl / maxMl) * 112) : 6;
      const localDate = new Date(`${day.date}T00:00:00`);
      const accessibleDate = localDate.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
      return <Pressable key={day.date} onPress={() => onSelect(day.date)} disabled={disabled} accessibilityRole="button" accessibilityLabel={t('chartDay', { weekday: dayLabels[index], date: accessibleDate, amount: new Intl.NumberFormat(locale).format(day.totalMl) })} accessibilityState={{ disabled, selected }} style={({ pressed }) => ({ flex: 1, minHeight: 184, alignItems: 'center', justifyContent: 'flex-end', gap: spacing.xs, opacity: disabled ? 0.35 : pressed ? 0.65 : 1 })}>
        <ThemedText variant="caption" themeColor={selected ? 'accent' : 'textSecondary'} style={{ textAlign: 'center' }}>{day.totalMl ? `${(day.totalMl / 1000).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}L` : '0'}</ThemedText>
        <View style={{ height, width: '100%', borderRadius: radius.md, backgroundColor: selected ? theme.accent : theme.accentSoft }} />
        <View style={{ minHeight: sizing.controlMin, minWidth: sizing.controlMin, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: selected ? theme.backgroundSelected : 'transparent' }}><ThemedText variant="labelStrong" themeColor={selected ? 'accent' : 'textSecondary'}>{dayLabels[index]}</ThemedText></View>
      </Pressable>;
    })}</View>
    <ThemedText variant="caption" themeColor="textSecondary" style={{ textAlign: 'center' }}>{t('chartSelectHint')}</ThemedText>
  </View>;
}
