import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { HealthMetricsSidebar } from '@/components/ui/health-metrics-sidebar';
import { useAuth } from '@/features/auth/store/auth-context';
import { statisticsCoolingDown } from '@/lib/api/http-client';
import { useHeartRateRefresh } from '@/features/heart-rate/hooks/use-heart-rate-refresh';
import { dateInHcm } from '@/features/heart-rate/utils/heart-rate-date';
import { useTranslations } from '@/i18n';
import { layout, sizing, spacing } from '@/theme';
import { useAppearance } from '@/theme/appearance-provider';
import { StatisticsBanner } from '../components/statistics-banner';
import { StatisticsMetricCard } from '../components/statistics-metric-card';
import { StatisticsPeriodSelector } from '../components/statistics-period-selector';
import { statisticsVisuals } from '../constants/statistics-visuals';
import { makePeriod } from '../data/statistics-period';
import { useStatisticsMetric } from '../hooks/use-statistics-metric';
import { statisticsMessages } from '../messages';
import { statisticsSources } from '../services/statistics-sources';
import type { StatisticsMode } from '../types/statistics';

export default function StatisticsScreen() {
  const insets = useSafeAreaInsets();
  const { scheme } = useAppearance();
  const t = useTranslations(statisticsMessages);
  const { status, user } = useAuth();
  const accountId = status === 'authenticated' ? user?.id : undefined;
  const visuals = statisticsVisuals[scheme];
  const [today, setToday] = useState(() => dateInHcm());
  const [mode, setMode] = useState<StatisticsMode>('week');
  const [selectedDate, setSelectedDate] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  const period = useMemo(() => makePeriod(mode, selectedDate ?? today, today), [mode, selectedDate, today]);
  const heartRate = useStatisticsMetric(statisticsSources.heartRate, period, accountId, refresh);
  const steps = useStatisticsMetric(statisticsSources.steps, period, accountId, refresh);
  const water = useStatisticsMetric(statisticsSources.water, period, accountId, refresh);
  const sleep = useStatisticsMetric(statisticsSources.sleep, period, accountId, refresh);
  const pending = heartRate.pending || steps.pending || water.pending;
  const refreshAll = useCallback(() => {
    if (pending || statisticsCoolingDown()) return;
    setToday(dateInHcm());
    setRefresh((value) => value + 1);
  }, [pending]);
  useHeartRateRefresh(refreshAll);
  const cards = [
    { metric: 'heartRate', route: '/heart-rate', query: heartRate },
    { metric: 'steps', route: '/steps', query: steps },
    { metric: 'water', route: '/water', query: water },
    { metric: 'sleep', route: '/sleep', query: sleep },
  ] as const;
  const refreshing = cards.some(({ query }) => query.pending && query.previous != null);

  const selectDate = (date: string) => {
    const currentStart = makePeriod(mode, today, today).start;
    setSelectedDate(date === currentStart ? undefined : date);
  };

  return (
    <View style={[styles.screen, {
      backgroundColor: visuals.background,
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    }]}>
      <View style={styles.shell}>
        <HealthMetricsSidebar brandedHeader />
        {Platform.OS === 'web' ? (
          <Pressable accessibilityRole="button" onPress={refreshAll} style={styles.refresh}>
            <ThemedText variant="labelStrong">{t('refresh')}</ThemedText>
          </Pressable>
        ) : null}
        <ScrollView contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={visuals.text} />}>
          <View style={styles.content}>
            <StatisticsBanner visuals={visuals} dark={scheme === 'dark'} />
            <StatisticsPeriodSelector period={period} visuals={visuals} onMode={setMode} onMove={selectDate} />
            <View style={styles.cards}>
              {cards.map(({ metric, route, query }) => (
                <StatisticsMetricCard key={metric} metric={metric} mode={mode} visuals={visuals}
                  state={query.state} previous={query.previous} onRetry={query.retry} onOpen={() => router.push(route)} />
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  refresh: { position: 'absolute', right: 0, top: 0, minHeight: sizing.controlMin, justifyContent: 'center' },
  shell: { flex: 1, marginHorizontal: spacing.md },
  scroll: { paddingBottom: spacing.lg },
  content: { width: '100%', maxWidth: layout.screenMax, alignSelf: 'center', gap: spacing.sm },
  cards: { gap: spacing.sm },
});
