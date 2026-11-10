import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { HealthMetricsSidebar } from '@/components/ui/health-metrics-sidebar';
import { useTheme } from '@/hooks/use-theme';
import { layout, sizing, spacing } from '@/theme';
import { Icon } from '../components/water-icon';
import { ProgressCard } from '../components/progress-card';
import { QuickAddCard } from '../components/quick-add-card';
import { IntakeCard } from '../components/intake-card';
import { useCreateWaterLog, useWaterDaily } from '../hooks/use-water';
import { localDateFromInstant } from '../utils/water-date';

export default function WaterLandingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [today, setToday] = useState(() => localDateFromInstant(new Date()));
  const [actionError, setActionError] = useState<string | null>(null);
  const { summary, loading, error } = useWaterDaily(today);
  const { createLog, submitting } = useCreateWaterLog();

  useFocusEffect(useCallback(() => {
    setToday(localDateFromInstant(new Date()));
  }, []));

  async function addIntake(amountMl: 100 | 250 | 500) {
    const loggedAt = new Date().toISOString();
    setActionError(null);
    try {
      await createLog({ amountMl, loggedAt, source: 'quick-add' });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not add water. Please try again.');
    }
  }

  return <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingTop: Math.max(insets.top + spacing.xs, spacing.lg), paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: spacing.md, alignItems: 'center' }}>
    <View style={{ width: '100%', maxWidth: layout.screenMax, gap: spacing.md }}>
      <HealthMetricsSidebar />
      <View style={{ minHeight: layout.waterHeaderMin, justifyContent: 'center', gap: spacing.sm }}>
        <Pressable onPress={() => router.push('/water/progress' as never)} accessibilityRole="button" accessibilityLabel="Open water progress calendar" hitSlop={8} style={({ pressed }) => ({ position: 'absolute', right: spacing.sm, top: spacing.sm, width: sizing.controlComfortable, height: sizing.controlComfortable, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}><Icon name="calendar" color={theme.accent} /></Pressable>
        <ThemedText variant="labelStrong" themeColor="accent" style={{ letterSpacing: 3 }}>WATER TRACKING</ThemedText>
        <ThemedText variant="largeTitle">Stay Hydrated</ThemedText>
        <ThemedText variant="body" themeColor="textSecondary" style={{ maxWidth: 280 }}>Good hydration keeps your body and mind in balance.</ThemedText>
      </View>
      {loading && !summary ? <ThemedText variant="body" themeColor="textSecondary">Loading today’s intake…</ThemedText> : null}
      {error ? <ThemedText variant="body" themeColor="danger">{error}</ThemedText> : null}
<<<<<<< HEAD
      {summary ? <ProgressCard summary={summary} theme={theme} /> : null}
      <QuickAddCard onAdd={addIntake} onCustom={() => router.push('/water/add' as never)} submitting={submitting} theme={theme} />
=======
      {summary ? <ProgressCard summary={summary} theme={theme} loading={loading || submitting} /> : null}
      <QuickAddCard onAdd={addIntake} onCustom={() => router.push('/water/add')} submitting={submitting} theme={theme} />
>>>>>>> feat/water-intake-fe-flow
      {actionError ? <ThemedText variant="body" themeColor="danger">{actionError}</ThemedText> : null}
      {summary ? <IntakeCard logs={summary.logs} limit={5} title="Today’s Intake" onSeeAll={() => router.push('/water/progress' as never)} theme={theme} /> : null}
    </View>
  </ScrollView>;
}
