import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/features/auth/store/auth-context';
import { heartRateApi, type HeartRateSeries } from '@/features/heart-rate/api/heart-rate-api';
import { useHeartRateRefresh } from '@/features/heart-rate/hooks/use-heart-rate-refresh';
import { dateInHcm, getMonday, shiftCalendarDate, validateHeartRateRange } from '@/features/heart-rate/utils/heart-rate-date';
import { stepsApi, type StepsSeries } from '@/features/steps/api/steps-api';
import { ApiError } from '@/lib/api/http-client';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, useTranslations } from '@/i18n';
import { radius, shadows, sizing, spacing } from '@/theme';
import { HeartRateChart } from '../components/heart-rate-chart';
import { StepsChart } from '@/features/steps/components/steps-chart';
import { statisticsMessages } from '../messages';

type Mode = 'day' | 'week' | 'custom';
type Metric = 'heart-rate' | 'steps';
type StatisticsFailure = 'chooseEarlier' | 'chooseMonday' | 'invalidRange' | 'sessionAttention' | 'loadFailed';
const modes: { id: Mode; label: 'day' | 'week' | 'custom' }[] = [{ id: 'day', label: 'day' }, { id: 'week', label: 'week' }, { id: 'custom', label: 'custom' }];

function displayDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00Z`));
}

export default function StatisticsScreen() {
  const theme = useTheme();
  const { locale } = useI18n();
  const t = useTranslations(statisticsMessages);
  const insets = useSafeAreaInsets();
  const { status, user } = useAuth();
  const today = useMemo(() => dateInHcm(), []);
  const [metric, setMetric] = useState<Metric>('heart-rate');
  const [mode, setMode] = useState<Mode>('day');
  const [date, setDate] = useState(today);
  const [weekStart, setWeekStart] = useState(getMonday(today));
  const [startDate, setStartDate] = useState(shiftCalendarDate(today, -1));
  const [endDate, setEndDate] = useState(today);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; series: HeartRateSeries | StepsSeries } | null>(null);
  const [failure, setFailure] = useState<{ key: string; reason: StatisticsFailure } | null>(null);
  const [settledQueryKey, setSettledQueryKey] = useState<string | null>(null);
  const requestId = useRef(0);
  const rangeError = mode === 'custom' ? validateHeartRateRange(startDate, endDate, today) : null;
  const params = useMemo(() => mode === 'day' ? { date } : mode === 'week' ? { weekStartDate: weekStart } : { startDate, endDate }, [mode, date, weekStart, startDate, endDate]);
  const queryKey = `${status}:${user?.id ?? ''}:${metric}:${mode}:${JSON.stringify(params)}:${retry}`;
  const dataKey = `${status}:${user?.id ?? ''}:${metric}:${mode}:${JSON.stringify(params)}`;
  const displayed = result?.key === dataKey ? result.series : null;
  const error = failure?.key === queryKey
    ? failure.reason === 'loadFailed'
      ? t('loadFailed', { metric: metric === 'steps' ? t('steps').toLowerCase() : t('heartRate').toLowerCase() })
      : t(failure.reason)
    : null;
  const validationError = rangeError ? t(rangeError) : null;
  const pending = status === 'authenticated' && !rangeError && settledQueryKey !== queryKey;
  const loading = pending && !displayed && !error;
  const refresh = useCallback(() => setRetry((value) => value + 1), []);
  useHeartRateRefresh(refresh);

  useEffect(() => {
    const id = ++requestId.current;
    if (status !== 'authenticated' || rangeError) return;
    const controller = new AbortController();
    (metric === 'steps' ? stepsApi.series(mode, params, controller.signal) : heartRateApi.series(mode, params, controller.signal))
      .then((series) => { if (id === requestId.current && !controller.signal.aborted) { setResult({ key: dataKey, series }); setFailure(null); setSettledQueryKey(queryKey); } })
      .catch((cause: unknown) => {
        if (id !== requestId.current || controller.signal.aborted) return;
        const reason: StatisticsFailure = cause instanceof ApiError && cause.code === 'INVALID_REPORT_DATE' ? 'chooseEarlier'
          : cause instanceof ApiError && cause.code === 'INVALID_WEEK_START_DATE' ? 'chooseMonday'
            : cause instanceof ApiError && cause.code === 'INVALID_DATE_RANGE' ? 'invalidRange'
              : cause instanceof ApiError && cause.status === 401 ? 'sessionAttention'
                : 'loadFailed';
        setFailure({ key: queryKey, reason });
        setSettledQueryKey(queryKey);
      });
    return () => { controller.abort(); if (requestId.current === id) requestId.current += 1; };
  }, [metric, mode, params, queryKey, rangeError, status, user?.id, dataKey]);

  const stepRange = useCallback((offset: number) => {
    if (mode === 'day') setDate((value) => shiftCalendarDate(value, offset));
    if (mode === 'week') setWeekStart((value) => shiftCalendarDate(value, offset * 7));
  }, [mode]);
  const period = mode === 'day' ? displayDate(date, locale) : mode === 'week' ? `${displayDate(weekStart, locale)} — ${displayDate(shiftCalendarDate(weekStart, 6), locale)}` : `${displayDate(startDate, locale)} — ${displayDate(endDate, locale)}`;
  const canAdvance = mode === 'day' ? date < today : mode === 'week' ? shiftCalendarDate(weekStart, 6) < today : false;
  const stepsSeries = displayed && 'totalSteps' in displayed ? displayed : null;
  const heartRateSeries = displayed && 'intervalMinutes' in displayed ? displayed : null;

  return <ScrollView refreshControl={<RefreshControl refreshing={pending} onRefresh={refresh} tintColor={theme.accent} />} style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: spacing.md }}>
    <View style={{ width: '100%', maxWidth: 620, alignSelf: 'center', gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <ThemedText variant="labelStrong" themeColor="accent">{t('wellness')}</ThemedText>
        <ThemedText variant="largeTitle">{t('title')}</ThemedText>
        <ThemedText variant="body" themeColor="textSecondary">{t('description')}</ThemedText>
      </View>
      <View style={{ padding: spacing.md, gap: spacing.md, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><ThemedText variant="heading">{t('metric')}</ThemedText>{typeof document !== 'undefined' ? <Pressable accessibilityRole="button" accessibilityLabel={t('refresh')} onPress={refresh} style={{ minHeight: sizing.controlMin, justifyContent: 'center', paddingHorizontal: spacing.xs }}><ThemedText variant="labelStrong" themeColor="accent">{t('refresh')}</ThemedText></Pressable> : null}</View>
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          {([{ id: 'heart-rate', label: 'heartRate' }, { id: 'steps', label: 'steps' }] as const).map(({ id, label }) => <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: metric === id }} onPress={() => setMetric(id)} style={{ minHeight: sizing.controlComfortable, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: metric === id ? id === 'steps' ? theme.steps : theme.heartRate : theme.backgroundSelected }}><ThemedText variant="labelStrong" themeColor={metric === id ? id === 'steps' ? 'onSteps' : 'onHeartRate' : 'textSecondary'}>{t(label)}</ThemedText></Pressable>)}
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          {modes.map(({ id, label }) => <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: mode === id }} onPress={() => setMode(id)} style={{ minHeight: sizing.controlComfortable, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: mode === id ? theme.accent : theme.backgroundSelected }}><ThemedText variant="labelStrong" themeColor={mode === id ? 'onAccent' : 'textSecondary'}>{t(label)}</ThemedText></Pressable>)}
        </View>
        {mode === 'custom' ? <View style={{ gap: spacing.xs }}>
          <ThemedText variant="caption" themeColor="textSecondary">{t('inclusiveDates')}</ThemedText>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TextInput accessibilityLabel={t('customStart')} value={startDate} onChangeText={setStartDate} placeholder={t('startDate')} placeholderTextColor={theme.textSecondary} autoCapitalize="none" style={{ minHeight: sizing.controlComfortable, flex: 1, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: rangeError ? theme.danger : theme.border, borderRadius: radius.md, color: theme.text, backgroundColor: theme.background }} />
            <TextInput accessibilityLabel={t('customEnd')} value={endDate} onChangeText={setEndDate} placeholder={t('endDate')} placeholderTextColor={theme.textSecondary} autoCapitalize="none" style={{ minHeight: sizing.controlComfortable, flex: 1, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: rangeError ? theme.danger : theme.border, borderRadius: radius.md, color: theme.text, backgroundColor: theme.background }} />
          </View>
          {validationError ? <ThemedText variant="caption" themeColor="danger" accessibilityRole="alert">{validationError}</ThemedText> : null}
        </View> : <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('previousRange')} onPress={() => stepRange(-1)} style={{ width: sizing.controlMin, minHeight: sizing.controlComfortable, justifyContent: 'center' }}><ThemedText variant="heading" themeColor="accent">‹</ThemedText></Pressable>
          <ThemedText variant="labelStrong" style={{ flex: 1, textAlign: 'center' }}>{period}</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel={t('nextRange')} accessibilityState={{ disabled: !canAdvance }} disabled={!canAdvance} onPress={() => stepRange(1)} style={{ width: sizing.controlMin, minHeight: sizing.controlComfortable, alignItems: 'flex-end', justifyContent: 'center', opacity: canAdvance ? 1 : 0.35 }}><ThemedText variant="heading" themeColor="accent">›</ThemedText></Pressable>
        </View>}
        <ThemedText variant="caption" themeColor="textSecondary">{metric === 'steps' ? t('totalSteps', { minutes: (stepsSeries?.bucketSizeMinutes ?? (mode === 'day' ? 60 : 1440)).toLocaleString(locale) }) : t('averageBpm', { period: mode === 'day' ? t('fifteenMinute') : t('hourly') })} · {displayed?.timezone ?? 'Asia/Ho_Chi_Minh'}</ThemedText>
        {loading ? <View accessibilityRole="progressbar" accessibilityLabel={t('loadingLabel', { metric: metric === 'steps' ? t('steps').toLowerCase() : t('heartRate').toLowerCase() })} style={{ minHeight: 180, alignItems: 'center', justifyContent: 'center' }}><ThemedText variant="body" themeColor="textSecondary">{t('loading', { metric: metric === 'steps' ? t('steps').toLowerCase() : t('heartRate').toLowerCase() })}</ThemedText></View> : error ? <View style={{ minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}><ThemedText variant="body" themeColor="danger" accessibilityRole="alert" style={{ textAlign: 'center' }}>{error}</ThemedText><Pressable accessibilityRole="button" accessibilityLabel={t('retry')} onPress={() => setRetry((value) => value + 1)} style={{ minHeight: sizing.controlMin, justifyContent: 'center', paddingHorizontal: spacing.md }}><ThemedText variant="labelStrong" themeColor="accent">{t('retry')}</ThemedText></Pressable></View> : displayed ? metric === 'steps' && stepsSeries ? <View style={{ gap: spacing.md }}><View style={{ alignItems: 'center', paddingVertical: spacing.md }}><ThemedText variant="metric" style={{ fontVariant: ['tabular-nums'] }}>{stepsSeries.totalSteps == null ? '—' : stepsSeries.totalSteps.toLocaleString(locale)}</ThemedText><ThemedText variant="caption" themeColor="textSecondary">{stepsSeries.totalSteps == null ? t('noSteps') : t('recordedSteps')}</ThemedText></View><StepsChart key={queryKey} series={stepsSeries} /></View> : metric === 'heart-rate' && heartRateSeries ? <HeartRateChart key={queryKey} series={heartRateSeries} /> : null : null}
      </View>
    </View>
  </ScrollView>;
}
