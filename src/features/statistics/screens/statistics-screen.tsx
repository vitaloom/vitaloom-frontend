import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/features/auth/store/auth-context';
import { heartRateApi, type HeartRateSeries } from '@/features/heart-rate/api/heart-rate-api';
import { useHeartRateRefresh } from '@/features/heart-rate/hooks/use-heart-rate-refresh';
import { dateInHcm, getMonday, shiftCalendarDate, validateHeartRateRange } from '@/features/heart-rate/utils/heart-rate-date';
import { ApiError } from '@/lib/api/http-client';
import { useTheme } from '@/hooks/use-theme';
import { radius, shadows, sizing, spacing } from '@/theme';
import { HeartRateChart } from '../components/heart-rate-chart';

type Mode = 'day' | 'week' | 'custom';
const modes: { id: Mode; label: string }[] = [{ id: 'day', label: 'Day' }, { id: 'week', label: 'Week' }, { id: 'custom', label: 'Custom' }];

export default function StatisticsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { status, user } = useAuth();
  const today = useMemo(() => dateInHcm(), []);
  const [mode, setMode] = useState<Mode>('day');
  const [date, setDate] = useState(today);
  const [weekStart, setWeekStart] = useState(getMonday(today));
  const [startDate, setStartDate] = useState(shiftCalendarDate(today, -1));
  const [endDate, setEndDate] = useState(today);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; series: HeartRateSeries } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [fetching, setFetching] = useState(false);
  const requestId = useRef(0);
  const rangeError = mode === 'custom' ? validateHeartRateRange(startDate, endDate, today) : null;
  const params = useMemo(() => mode === 'day' ? { date } : mode === 'week' ? { weekStartDate: weekStart } : { startDate, endDate }, [mode, date, weekStart, startDate, endDate]);
  const queryKey = `${status}:${user?.id ?? ''}:${mode}:${JSON.stringify(params)}:${retry}`;
  const dataKey = `${status}:${user?.id ?? ''}:${mode}:${JSON.stringify(params)}`;
  const displayed = result?.key === dataKey ? result.series : null;
  const error = failure?.key === queryKey ? failure.message : null;
  const loading = status === 'authenticated' && !rangeError && !displayed && !error;
  const refresh = useCallback(() => setRetry((value) => value + 1), []);
  useHeartRateRefresh(refresh);

  useEffect(() => {
    const id = ++requestId.current;
    if (status !== 'authenticated' || rangeError) { setFetching(false); return; }
    const controller = new AbortController();
    setFetching(true);
    heartRateApi.series(mode, params, controller.signal)
      .then((series) => { if (id === requestId.current && !controller.signal.aborted) { setResult({ key: dataKey, series }); setFailure(null); setFetching(false); } })
      .catch((cause: unknown) => {
        if (id !== requestId.current || controller.signal.aborted) return;
        const message = cause instanceof ApiError && cause.code === 'INVALID_REPORT_DATE' ? 'Choose today or an earlier date.'
          : cause instanceof ApiError && cause.code === 'INVALID_WEEK_START_DATE' ? 'Choose a Monday for the week start.'
            : cause instanceof ApiError && cause.code === 'INVALID_DATE_RANGE' ? 'The selected date range is invalid.'
              : cause instanceof ApiError && cause.status === 401 ? 'Your session needs attention. Sign in again to view statistics.'
                : cause instanceof Error ? cause.message : 'Unable to load heart rate statistics.';
        setFailure({ key: queryKey, message });
        setFetching(false);
      });
    return () => { controller.abort(); if (requestId.current === id) requestId.current += 1; };
  }, [mode, params, queryKey, rangeError, status, user?.id, dataKey]);

  const stepRange = useCallback((offset: number) => {
    if (mode === 'day') setDate((value) => shiftCalendarDate(value, offset));
    if (mode === 'week') setWeekStart((value) => shiftCalendarDate(value, offset * 7));
  }, [mode]);
  const period = mode === 'day' ? date : mode === 'week' ? `${weekStart} — ${shiftCalendarDate(weekStart, 6)}` : `${startDate} — ${endDate}`;
  const canAdvance = mode === 'day' ? date < today : mode === 'week' ? shiftCalendarDate(weekStart, 6) < today : false;

  return <ScrollView refreshControl={<RefreshControl refreshing={fetching} onRefresh={refresh} tintColor={theme.accent} />} style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: spacing.md }}>
    <View style={{ width: '100%', maxWidth: 620, alignSelf: 'center', gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <ThemedText variant="labelStrong" themeColor="accent">YOUR WELLNESS</ThemedText>
        <ThemedText variant="largeTitle">Statistics</ThemedText>
        <ThemedText variant="body" themeColor="textSecondary">Heart rate averages from recorded measurements.</ThemedText>
      </View>
      <View style={{ padding: spacing.md, gap: spacing.md, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><ThemedText variant="heading">Heart Rate</ThemedText>{typeof document !== 'undefined' ? <Pressable accessibilityRole="button" onPress={refresh} style={{ minHeight: sizing.controlMin, justifyContent: 'center', paddingHorizontal: spacing.xs }}><ThemedText variant="labelStrong" themeColor="accent">Refresh</ThemedText></Pressable> : null}</View>
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          {modes.map(({ id, label }) => <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: mode === id }} onPress={() => setMode(id)} style={{ minHeight: sizing.controlComfortable, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: mode === id ? theme.accent : theme.backgroundSelected }}><ThemedText variant="labelStrong" themeColor={mode === id ? 'onAccent' : 'textSecondary'}>{label}</ThemedText></Pressable>)}
        </View>
        {mode === 'custom' ? <View style={{ gap: spacing.xs }}>
          <ThemedText variant="caption" themeColor="textSecondary">Inclusive dates (YYYY-MM-DD), maximum 30 days</ThemedText>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TextInput accessibilityLabel="Custom range start date" value={startDate} onChangeText={setStartDate} placeholder="Start date" placeholderTextColor={theme.textSecondary} autoCapitalize="none" style={{ minHeight: sizing.controlComfortable, flex: 1, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: rangeError ? theme.danger : theme.border, borderRadius: radius.md, color: theme.text, backgroundColor: theme.background }} />
            <TextInput accessibilityLabel="Custom range end date" value={endDate} onChangeText={setEndDate} placeholder="End date" placeholderTextColor={theme.textSecondary} autoCapitalize="none" style={{ minHeight: sizing.controlComfortable, flex: 1, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: rangeError ? theme.danger : theme.border, borderRadius: radius.md, color: theme.text, backgroundColor: theme.background }} />
          </View>
          {rangeError ? <ThemedText variant="caption" themeColor="danger" accessibilityRole="alert">{rangeError}</ThemedText> : null}
        </View> : <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous range" onPress={() => stepRange(-1)} style={{ width: sizing.controlMin, minHeight: sizing.controlComfortable, justifyContent: 'center' }}><ThemedText variant="heading" themeColor="accent">‹</ThemedText></Pressable>
          <ThemedText variant="labelStrong" style={{ flex: 1, textAlign: 'center' }}>{period}</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel="Next range" accessibilityState={{ disabled: !canAdvance }} disabled={!canAdvance} onPress={() => stepRange(1)} style={{ width: sizing.controlMin, minHeight: sizing.controlComfortable, alignItems: 'flex-end', justifyContent: 'center', opacity: canAdvance ? 1 : 0.35 }}><ThemedText variant="heading" themeColor="accent">›</ThemedText></Pressable>
        </View>}
        <ThemedText variant="caption" themeColor="textSecondary">Average BPM per {mode === 'day' ? '15-minute' : 'hourly'} bucket · {displayed?.timezone ?? 'Asia/Ho_Chi_Minh'}</ThemedText>
        {loading ? <View style={{ minHeight: 180, alignItems: 'center', justifyContent: 'center' }}><ThemedText variant="body" themeColor="textSecondary">Loading heart rate data…</ThemedText></View> : error ? <View style={{ minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}><ThemedText variant="body" themeColor="danger" style={{ textAlign: 'center' }}>{error}</ThemedText><Pressable accessibilityRole="button" onPress={() => setRetry((value) => value + 1)} style={{ minHeight: sizing.controlMin, justifyContent: 'center', paddingHorizontal: spacing.md }}><ThemedText variant="labelStrong" themeColor="accent">Retry</ThemedText></Pressable></View> : displayed ? <HeartRateChart key={queryKey} series={displayed} /> : null}
      </View>
    </View>
  </ScrollView>;
}
