import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { spacing } from '@/theme';
import { useAuth } from '@/features/auth/store/auth-context';
import { heartRateApi, type HeartRateSummary } from '@/features/heart-rate/api/heart-rate-api';
import { dateInHcm } from '@/features/heart-rate/utils/heart-rate-date';
import { DashboardHeader } from '../components/dashboard-header';
import { MetricCard, type HeartRateTile } from '../components/metric-card';
import { Reminder } from '../components/reminder';
import { WellnessBanner } from '../components/wellness-banner';
import { dashboardMetrics, dashboardUser } from '../data/dashboard';

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 370;
  const { status, user } = useAuth();
  const [request, setRequest] = useState(0);
  const [settled, setSettled] = useState<{ key: string; summary?: HeartRateSummary; failed?: true } | null>(null);
  const sessionKey = `${status}:${user?.id ?? ''}:${request}`;
  const retry = useCallback(() => setRequest((value) => value + 1), []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const controller = new AbortController();
    let active = true;
    heartRateApi.summary(dateInHcm(), controller.signal)
      .then((result) => { if (active) setSettled({ key: sessionKey, summary: result }); })
      .catch(() => { if (active && !controller.signal.aborted) setSettled({ key: sessionKey, failed: true }); });
    return () => { active = false; controller.abort(); };
  }, [status, user?.id, request, sessionKey]);

  const current = settled?.key === sessionKey ? settled : null;
  const latest = current?.summary?.latestRecorded;
  const heartRate: HeartRateTile = current?.failed ? { state: 'error' } : !current ? { state: 'loading' } : latest ? { state: 'ready', bpm: latest.heartRateBpm, occurredAt: latest.occurredAt } : { state: 'empty' };
  return <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: spacing.lg, paddingHorizontal: spacing.md, alignItems: 'center' }}>
    <View style={{ width: '100%', maxWidth: 520, gap: 12 }}>
      <DashboardHeader user={dashboardUser} />
      <WellnessBanner compact={compact} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
        {dashboardMetrics.map((metric) => <MetricCard key={metric.key} metric={metric} compact={compact} heartRate={metric.key === 'heart-rate' ? heartRate : undefined} onRetry={retry} />)}
      </View>
      <Reminder />
    </View>
  </ScrollView>;
}
