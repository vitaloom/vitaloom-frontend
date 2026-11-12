import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';

import { useTheme } from '@/hooks/use-theme';
import { spacing } from '@/theme';
import { useAuth } from '@/features/auth/store/auth-context';
import { heartRateApi, type HeartRateSummary } from '@/features/heart-rate/api/heart-rate-api';
import { stepsApi } from '@/features/steps/api/steps-api';
import { dateInHcm } from '@/features/heart-rate/utils/heart-rate-date';
import { useHeartRateRefresh } from '@/features/heart-rate/hooks/use-heart-rate-refresh';
import { DashboardHeader } from '../components/dashboard-header';
import { MetricCard, type HeartRateTile, type StepsTile } from '../components/metric-card';
import { Reminder } from '../components/reminder';
import { WellnessBanner } from '../components/wellness-banner';
import { dashboardMetrics, dashboardUser } from '../data/dashboard';
import { useTranslations } from '@/i18n';
import { homeMessages } from '../messages';

export default function HomeScreen() {
  const theme = useTheme();
  const t = useTranslations(homeMessages);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 370;
  const { status, user } = useAuth();
  const [request, setRequest] = useState(0);
  const [settled, setSettled] = useState<{ key: string; summary?: HeartRateSummary; failed?: true } | null>(null);
  const [stepsSettled, setStepsSettled] = useState<{ key: string; totalSteps: number | null; goal?: number; progressPercent?: number | null; buckets: (number | null)[] } | { key: string; failed: true } | null>(null);
  const sessionKey = `${status}:${user?.id ?? ''}`;
  const retry = useCallback(() => setRequest((value) => value + 1), []);
  useHeartRateRefresh(retry);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const controller = new AbortController();
    let active = true;
    heartRateApi.summary(dateInHcm(), controller.signal)
      .then((result) => { if (active) setSettled({ key: sessionKey, summary: result }); })
      .catch(() => { if (active && !controller.signal.aborted) setSettled({ key: sessionKey, failed: true }); });
    return () => { active = false; controller.abort(); };
  }, [status, user?.id, request, sessionKey]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const controller = new AbortController();
    let active = true;
    stepsApi.series('day', { date: dateInHcm() }, controller.signal)
      .then((result) => { if (active) setStepsSettled({ key: sessionKey, totalSteps: result.totalSteps, goal: result.goal?.targetSteps, progressPercent: result.progressPercent, buckets: result.buckets.map((bucket) => bucket.steps) }); })
      .catch(() => { if (active && !controller.signal.aborted) setStepsSettled({ key: sessionKey, failed: true }); });
    return () => { active = false; controller.abort(); };
  }, [status, user?.id, request, sessionKey]);

  const current = settled?.key === sessionKey ? settled : null;
  const latest = current?.summary?.latestRecorded;
  const heartRate: HeartRateTile = current?.failed ? { state: 'error' } : !current ? { state: 'loading' } : latest ? { state: 'ready', bpm: latest.heartRateBpm, occurredAt: latest.occurredAt } : { state: 'empty' };
  const currentSteps = stepsSettled?.key === sessionKey ? stepsSettled : null;
  const steps: StepsTile = status !== 'authenticated' ? { state: 'empty' } : currentSteps && 'failed' in currentSteps ? { state: 'error' } : currentSteps ? { state: 'ready', totalSteps: currentSteps.totalSteps, goal: currentSteps.goal, progressPercent: currentSteps.progressPercent, buckets: currentSteps.buckets } : { state: 'loading' };
  return <ScrollView refreshControl={<RefreshControl refreshing={status === 'authenticated' && !current} onRefresh={retry} tintColor={theme.accent} />} style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: spacing.lg, paddingHorizontal: spacing.md, alignItems: 'center' }}>
    <View style={{ width: '100%', maxWidth: 520, gap: 12 }}>
      <DashboardHeader user={dashboardUser} />
      {typeof document !== 'undefined' ? <Pressable accessibilityRole="button" accessibilityLabel={t('home.refresh')} onPress={retry} style={{ alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm }}><ThemedText variant="labelStrong" style={{ color: theme.accent }}>{t('home.refresh')}</ThemedText></Pressable> : null}
      <WellnessBanner compact={compact} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
        {dashboardMetrics.map((metric) => <MetricCard key={metric.key} metric={metric} compact={compact} heartRate={metric.key === 'heart-rate' ? heartRate : undefined} steps={metric.key === 'steps' ? steps : undefined} onRetry={retry} />)}
      </View>
      <Reminder />
    </View>
  </ScrollView>;
}
