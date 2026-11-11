import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, useTranslations } from '@/i18n';
import { layout, sizing, spacing } from '@/theme';
import { IntakeCard } from '../components/intake-card';
import { ProgressCard } from '../components/progress-card';
import { WaterWeeklyBarChart } from '../components/water-weekly-bar-chart';
import { useWaterDaily, useWaterWeekly } from '../hooks/use-water';
import { getMondayOfWeek, localDateFromInstant, parseLocalDate } from '../utils/water-date';
import { waterMessages } from '../messages';

function shiftWeek(weekStart: string, weeks: number): string {
  const date = parseLocalDate(weekStart);
  if (!date) return weekStart;
  date.setDate(date.getDate() + weeks * 7);
  return localDateFromInstant(date);
}

export default function WaterProgressScreen() {
  const theme = useTheme();
  const { locale } = useI18n();
  const t = useTranslations(waterMessages);
  const insets = useSafeAreaInsets();
  const [today, setToday] = useState(() => localDateFromInstant(new Date()));
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(localDateFromInstant(new Date())));
  const [selectedDate, setSelectedDate] = useState(() => localDateFromInstant(new Date()));
  const { summary: weekly, loading: weeklyLoading, error: weeklyError } = useWaterWeekly(weekStart);
  const { summary: daily, loading: dailyLoading, error: dailyError } = useWaterDaily(selectedDate);
  const currentWeek = getMondayOfWeek(today);
  const canGoNext = weekStart < currentWeek;

  useFocusEffect(useCallback(() => { setToday(localDateFromInstant(new Date())); }, []));

  function changeWeek(direction: -1 | 1) {
    const next = shiftWeek(weekStart, direction);
    if (next > currentWeek) return;
    setWeekStart(next);
    setSelectedDate(next === currentWeek ? today : next);
  }

  const startDate = parseLocalDate(weekStart);
  const endDate = parseLocalDate(shiftWeek(weekStart, 1));
  if (endDate) endDate.setDate(endDate.getDate() - 1);
  const weekLabel = startDate && endDate ? t('previousWeekRange', { start: startDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' }), end: endDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' }) }) : weekStart;
  const dayLabel = parseLocalDate(selectedDate)?.toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric' }) ?? selectedDate;

  return <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingTop: Math.max(insets.top + spacing.sm, spacing.lg), paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: spacing.md, alignItems: 'center' }}>
    <View style={{ width: '100%', maxWidth: layout.screenMax, gap: spacing.md }}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('backLabel')} style={({ pressed }) => ({ minHeight: sizing.controlComfortable, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}><ThemedText variant="bodyStrong" themeColor="accent">{t('back')}</ThemedText></Pressable>
      <ThemedText variant="largeTitle">{t('progressTitle')}</ThemedText>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => changeWeek(-1)} accessibilityRole="button" accessibilityLabel={t('previousWeek')} style={{ minWidth: sizing.controlComfortable, minHeight: sizing.controlComfortable, justifyContent: 'center' }}><ThemedText variant="heading" themeColor="accent">‹</ThemedText></Pressable>
        <ThemedText variant="bodyStrong">{weekLabel}</ThemedText>
        <Pressable onPress={() => changeWeek(1)} disabled={!canGoNext} accessibilityRole="button" accessibilityLabel={t('nextWeek')} accessibilityState={{ disabled: !canGoNext }} style={{ minWidth: sizing.controlComfortable, minHeight: sizing.controlComfortable, alignItems: 'flex-end', justifyContent: 'center', opacity: canGoNext ? 1 : 0.3 }}><ThemedText variant="heading" themeColor="accent">›</ThemedText></Pressable>
      </View>
      {weeklyLoading && !weekly ? <ThemedText variant="body" themeColor="textSecondary">{t('loadingWeek')}</ThemedText> : null}
      {weeklyError ? <ThemedText variant="body" themeColor="danger">{t('weeklyError')}</ThemedText> : null}
      {weekly ? <WaterWeeklyBarChart summary={weekly} selectedDate={selectedDate} today={today} onSelect={setSelectedDate} theme={theme} /> : null}
      {dailyLoading && !daily ? <ThemedText variant="body" themeColor="textSecondary">{t('loadingDay')}</ThemedText> : null}
      {dailyError ? <ThemedText variant="body" themeColor="danger">{t('dayError')}</ThemedText> : null}
      {daily ? <ProgressCard summary={daily} theme={theme} label={dayLabel} /> : null}
      {daily ? <IntakeCard logs={daily.logs} title={t('logsFor', { day: dayLabel })} theme={theme} locale={locale} /> : null}
    </View>
  </ScrollView>;
}
