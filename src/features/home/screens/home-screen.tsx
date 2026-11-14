import { useCallback, useEffect, useRef, useState } from 'react';
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
import { isStatisticsRateLimit, statisticsCoolingDown } from '@/lib/api/http-client';
import { useSleepRead, useSleepRepository } from '@/features/sleep/hooks/use-sleep';
import { DashboardHeader } from '../components/dashboard-header';
import { MetricCard, type HeartRateTile, type SleepTile, type StepsTile } from '../components/metric-card';
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
  const sleepRepository = useSleepRepository();
  const { state: sleepDaily, reload: reloadSleep } = useSleepRead(
    () => sleepRepository.getDaily(sleepRepository.getContext().today), 'home:daily-sleep');
  const statsPending = useRef(0);
  const retry = useCallback(() => {
    if (!statsPending.current && !statisticsCoolingDown()) setRequest((value) => value + 1);
  }, []);
  const refresh = useCallback(() => {
    retry();
    reloadSleep();
  }, [retry, reloadSleep]);
  useHeartRateRefresh(retry);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const controller = new AbortController();
    let active = true;
    statsPending.current += 1;
    heartRateApi.summary(dateInHcm(), controller.signal)
      .then((result) => { if (active) setSettled({ key: sessionKey, summary: result }); })
      .catch((error: unknown) => {
        if (!active) return;
        if (isStatisticsRateLimit(error)) {
          setSettled((previous) => previous?.key === sessionKey ? previous : { key: sessionKey });
        } else {
          setSettled({ key: sessionKey, failed: true });
        }
      })
      .finally(() => { statsPending.current -= 1; });
    return () => { active = false; controller.abort(); };
  }, [status, user?.id, request, sessionKey]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const controller = new AbortController();
    let active = true;
    statsPending.current += 1;
    stepsApi.series('day', { date: dateInHcm() }, controller.signal)
      .then((result) => { if (active) setStepsSettled({ key: sessionKey, totalSteps: result.totalSteps, goal: result.goal?.targetSteps, progressPercent: result.progressPercent, buckets: result.buckets.map((bucket) => bucket.steps) }); })
      .catch((error: unknown) => { if (active && !isStatisticsRateLimit(error)) setStepsSettled({ key: sessionKey, failed: true }); })
      .finally(() => { statsPending.current -= 1; });
    return () => { active = false; controller.abort(); };
  }, [status, user?.id, request, sessionKey]);

  const current = settled?.key === sessionKey ? settled : null;
  const latest = current?.summary?.latestRecorded;
  const heartRate: HeartRateTile = current?.failed ? { state: 'error' } : !current ? { state: 'loading' } : latest ? { state: 'ready', bpm: latest.heartRateBpm, occurredAt: latest.occurredAt } : { state: 'empty' };
  const currentSteps = stepsSettled?.key === sessionKey ? stepsSettled : null;
  const steps: StepsTile = status !== 'authenticated' ? { state: 'empty' } : currentSteps && 'failed' in currentSteps ? { state: 'error' } : currentSteps ? { state: 'ready', totalSteps: currentSteps.totalSteps, goal: currentSteps.goal, progressPercent: currentSteps.progressPercent, buckets: currentSteps.buckets } : { state: 'loading' };
  const sleep: SleepTile = sleepDaily.kind === 'ready' && sleepDaily.data.status === 'recorded' && sleepDaily.data.minutes != null
    ? { state: 'ready', minutes: sleepDaily.data.minutes, goal: sleepDaily.data.goal.minutes }
    : { state: sleepDaily.kind === 'loading' ? 'loading' : sleepDaily.kind === 'ready' && sleepDaily.data.status === 'no-data' ? 'empty' : 'error' };
  return <ScrollView refreshControl={<RefreshControl refreshing={status === 'authenticated' && !current} onRefresh={refresh} tintColor={theme.accent} />} style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: spacing.lg, paddingHorizontal: spacing.md, alignItems: 'center' }}>
    <View style={{ width: '100%', maxWidth: 520, gap: 12 }}>
      <DashboardHeader user={dashboardUser} />
      {typeof document !== 'undefined' ? <Pressable accessibilityRole="button" accessibilityLabel={t('home.refresh')} onPress={refresh} style={{ alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm }}><ThemedText variant="labelStrong" style={{ color: theme.accent }}>{t('home.refresh')}</ThemedText></Pressable> : null}
      <WellnessBanner compact={compact} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
        {dashboardMetrics.map((metric) => <MetricCard key={metric.key} metric={metric} compact={compact} heartRate={metric.key === 'heart-rate' ? heartRate : undefined} steps={metric.key === 'steps' ? steps : undefined} sleep={metric.key === 'sleep' ? sleep : undefined} onRetry={metric.key === 'sleep' ? reloadSleep : retry} />)}
      </View>
      <Reminder />
    </View>
  </ScrollView>;
}
