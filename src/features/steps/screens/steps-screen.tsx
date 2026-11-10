import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { HealthMetricsSidebar } from '@/components/ui/health-metrics-sidebar';
import { useAuth } from '@/features/auth/store/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api/http-client';
import { radius, shadows, sizing, spacing } from '@/theme';
import { stepsApi, type StepsSeries } from '../api/steps-api';
import { StepsChart } from '../components/steps-chart';
import { dateInHcm, isFutureHcmDate, shiftCalendarDate, weekDates } from '../utils/steps-date';

function displayDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00Z`));
}

export default function StepsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { status, user } = useAuth();
  const today = useMemo(() => dateInHcm(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(() => weekDates(today)[0]);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; series: StepsSeries } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [settledQueryKey, setSettledQueryKey] = useState<string | null>(null);
  const requestId = useRef(0);
  const sessionKey = `${status}:${user?.id ?? ''}`;
  const dataKey = `${sessionKey}:${selectedDate}`;
  const queryKey = `${dataKey}:${retry}`;
  const displayed = result?.key === dataKey ? result.series : null;
  const error = failure?.key === queryKey ? failure.message : null;
  const pending = status === 'authenticated' && settledQueryKey !== queryKey;
  const loading = pending && !displayed && !error;
  const refresh = useCallback(() => setRetry((value) => value + 1), []);
  const dates = weekDates(weekStart);
  const canAdvanceWeek = shiftCalendarDate(weekStart, 7) <= today;

  useEffect(() => {
    const id = ++requestId.current;
    if (status !== 'authenticated') return;
    const controller = new AbortController();
    stepsApi.series('day', { date: selectedDate }, controller.signal)
      .then((series) => { if (id === requestId.current && !controller.signal.aborted) { setResult({ key: dataKey, series }); setFailure(null); setSettledQueryKey(queryKey); } })
      .catch((cause: unknown) => {
        if (id !== requestId.current || controller.signal.aborted) return;
        const message = cause instanceof ApiError && cause.status === 401 ? 'Your session needs attention. Sign in again to view steps.'
          : cause instanceof Error ? cause.message : 'Unable to load steps for this day.';
        setFailure({ key: queryKey, message });
        setSettledQueryKey(queryKey);
      });
    return () => { controller.abort(); if (requestId.current === id) requestId.current += 1; };
  }, [status, user?.id, selectedDate, retry, sessionKey, dataKey, queryKey]);

  const moveWeek = (offset: number) => {
    const nextStart = shiftCalendarDate(weekStart, offset * 7);
    setWeekStart(nextStart);
    setSelectedDate(shiftCalendarDate(selectedDate, offset * 7));
  };

  return <ScrollView refreshControl={<RefreshControl refreshing={pending} onRefresh={refresh} tintColor={theme.steps} />} style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg, paddingHorizontal: spacing.md }}>
    <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', gap: spacing.lg }}>
      <HealthMetricsSidebar />
      <View style={{ gap: spacing.xs }}>
        <ThemedText variant="labelStrong" themeColor="steps">Activity</ThemedText>
        <ThemedText variant="largeTitle">Steps</ThemedText>
        <ThemedText variant="body" themeColor="textSecondary">Recorded movement for the selected day.</ThemedText>
      </View>

      <View style={{ padding: spacing.md, gap: spacing.md, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <ThemedText variant="heading">Choose a day</ThemedText>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous week" onPress={() => moveWeek(-1)} style={{ minWidth: sizing.controlMin, minHeight: sizing.controlComfortable, justifyContent: 'center' }}><ThemedText variant="heading" themeColor="steps">‹</ThemedText></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Next week" accessibilityState={{ disabled: !canAdvanceWeek }} disabled={!canAdvanceWeek} onPress={() => moveWeek(1)} style={{ minWidth: sizing.controlMin, minHeight: sizing.controlComfortable, alignItems: 'flex-end', justifyContent: 'center', opacity: canAdvanceWeek ? 1 : 0.35 }}><ThemedText variant="heading" themeColor="steps">›</ThemedText></Pressable>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs }}>
          {dates.map((date) => {
            const selected = date === selectedDate;
            const future = isFutureHcmDate(date, today);
            const day = new Date(`${date}T12:00:00Z`);
            const weekday = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short' }).format(day);
            return <Pressable key={date} accessibilityRole="button" accessibilityLabel={displayDate(date)} accessibilityState={{ selected, disabled: future }} disabled={future} onPress={() => setSelectedDate(date)} style={{ flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radius.md, backgroundColor: selected ? theme.steps : theme.backgroundSelected, opacity: future ? 0.45 : 1 }}>
              <ThemedText variant="caption" themeColor={selected ? 'onAccent' : 'textSecondary'}>{weekday}</ThemedText>
              <ThemedText variant="labelStrong" themeColor={selected ? 'onAccent' : 'text'}>{date.slice(-2)}</ThemedText>
            </Pressable>;
          })}
        </View>
        <ThemedText variant="labelStrong" style={{ textAlign: 'center' }}>{displayDate(selectedDate)}</ThemedText>
      </View>

      <View style={{ padding: spacing.lg, gap: spacing.sm, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card }}>
        <ThemedText variant="labelStrong" themeColor="textSecondary">RECORDED STEPS</ThemedText>
        {loading ? <View accessibilityRole="progressbar" accessibilityLabel="Loading steps" style={{ minHeight: 120, justifyContent: 'center' }}><ThemedText variant="body" themeColor="textSecondary">Loading steps…</ThemedText></View>
          : error ? <View style={{ minHeight: 120, justifyContent: 'center', alignItems: 'flex-start', gap: spacing.sm }}><ThemedText variant="body" themeColor="danger" accessibilityRole="alert">{error}</ThemedText><Pressable accessibilityRole="button" onPress={refresh} style={{ minHeight: sizing.controlMin, justifyContent: 'center' }}><ThemedText variant="labelStrong" themeColor="steps">Retry</ThemedText></Pressable></View>
            : displayed ? <>
              <ThemedText variant="metricLarge" style={{ fontVariant: ['tabular-nums'] }}>{displayed.totalSteps == null ? '—' : displayed.totalSteps.toLocaleString()}</ThemedText>
              <ThemedText variant="body" themeColor="textSecondary">{displayed.totalSteps == null ? 'No recorded steps for this day.' : `${displayed.buckets.reduce((count, bucket) => count + bucket.eventCount, 0).toLocaleString()} recorded increments`}</ThemedText>
              <View style={{ height: 1, backgroundColor: theme.border, marginVertical: spacing.sm }} />
              <View style={{ gap: spacing.xs }}><ThemedText variant="heading">By hour</ThemedText><ThemedText variant="caption" themeColor="textSecondary">{displayed.timezone} · 60 minute buckets</ThemedText></View>
              <StepsChart key={selectedDate} series={displayed} />
            </> : <ThemedText variant="body" themeColor="textSecondary">Sign in to view recorded steps.</ThemedText>}
      </View>

      <View style={{ padding: spacing.md, gap: spacing.xs, borderRadius: radius.lg, backgroundColor: theme.stepsSoft }}>
        <ThemedText variant="labelStrong" themeColor="steps">About this record</ThemedText>
        <ThemedText variant="body" themeColor="textSecondary">Totals include accepted step increments recorded by VitaLoom. An empty bucket means no steps were recorded there; it does not confirm zero activity.</ThemedText>
      </View>
    </View>
  </ScrollView>;
}
