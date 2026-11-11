import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { HealthMetricsSidebar } from '@/components/ui/health-metrics-sidebar';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, useTranslations } from '@/i18n';
import { layout, sizing, spacing } from '@/theme';
import { Icon } from '../components/water-icon';
import { ProgressCard } from '../components/progress-card';
import { QuickAddCard } from '../components/quick-add-card';
import { IntakeCard } from '../components/intake-card';
import { useCreateWaterLog, useWaterDaily } from '../hooks/use-water';
import { localDateFromInstant } from '../utils/water-date';
import { waterMessages } from '../messages';

export default function WaterLandingScreen() {
  const theme = useTheme();
  const { locale } = useI18n();
  const t = useTranslations(waterMessages);
  const insets = useSafeAreaInsets();
  const [today, setToday] = useState(() => localDateFromInstant(new Date()));
  const [actionError, setActionError] = useState<string | null>(null);
  const { summary, loading, error } = useWaterDaily(today);
  const { createLog, submitting } = useCreateWaterLog();

  useFocusEffect(useCallback(() => {
    setToday(localDateFromInstant(new Date()));
  }, []));

  async function addIntake(amountMl: 100 | 250 | 500) {
    setActionError(null);
    try {
      await createLog({ amountMl, source: 'quick-add' });
    } catch {
      setActionError(t('addError'));
    }
  }

  return <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingTop: Math.max(insets.top + spacing.xs, spacing.lg), paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: spacing.md, alignItems: 'center' }}>
    <View style={{ width: '100%', maxWidth: layout.screenMax, gap: spacing.md }}>
      <HealthMetricsSidebar />
      <View style={{ minHeight: layout.waterHeaderMin, justifyContent: 'center', gap: spacing.sm }}>
        <Pressable onPress={() => router.push('/water/progress' as never)} accessibilityRole="button" accessibilityLabel={t('openCalendar')} hitSlop={8} style={({ pressed }) => ({ position: 'absolute', right: spacing.sm, top: spacing.sm, width: sizing.controlComfortable, height: sizing.controlComfortable, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}><Icon name="calendar" color={theme.accent} /></Pressable>
        <ThemedText variant="labelStrong" themeColor="accent" style={{ letterSpacing: 3 }}>{t('eyebrow')}</ThemedText>
        <ThemedText variant="largeTitle">{t('title')}</ThemedText>
        <ThemedText variant="body" themeColor="textSecondary" style={{ maxWidth: 280 }}>{t('intro')}</ThemedText>
      </View>
      {loading && !summary ? <ThemedText variant="body" themeColor="textSecondary">{t('loadingToday')}</ThemedText> : null}
      {error ? <ThemedText variant="body" themeColor="danger">{t('dailyError')}</ThemedText> : null}
      {summary ? <ProgressCard summary={summary} theme={theme} loading={loading || submitting} /> : null}
      <QuickAddCard onAdd={addIntake} onCustom={() => router.push('/water/add')} submitting={submitting} theme={theme} />
      {actionError ? <ThemedText variant="body" themeColor="danger">{actionError}</ThemedText> : null}
      {summary ? <IntakeCard logs={summary.logs} limit={5} title={t('todayIntake')} onSeeAll={() => router.push('/water/progress' as never)} theme={theme} locale={locale} /> : null}
    </View>
  </ScrollView>;
}
