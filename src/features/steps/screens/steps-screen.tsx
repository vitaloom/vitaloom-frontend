import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, SvgXml } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { HealthMetricsSidebar } from '@/components/ui/health-metrics-sidebar';
import { useAuth } from '@/features/auth/store/auth-context';
import { useHeartRateRefresh } from '@/features/heart-rate/hooks/use-heart-rate-refresh';
import { useTheme } from '@/hooks/use-theme';
import { useAppearance } from '@/theme/appearance-provider';
import { useI18n, useTranslations } from '@/i18n';
import { ApiError } from '@/lib/api/http-client';
import { radius, shadows, sizing, spacing } from '@/theme';
import { stepsApi, type StepsGoal, type StepsSeries } from '../api/steps-api';
import { StepsDetailChart } from '../components/steps-detail-chart';
import { StepsDailyGoal } from '../components/steps-daily-goal';
import { dateInHcm, getMonday, isFutureHcmDate, shiftCalendarDate, weekDates } from '../utils/steps-date';
import { stepsMessages } from '../messages';
import { stepsArt } from '../assets/steps-art';

type StepsPeriod = 'day' | 'week';
const periods: StepsPeriod[] = ['day', 'week'];
const nativeSneakers = stepsArt.sneakers.replace(/<filter[\s\S]*?<\/filter>/g, '').replace(/\sfilter="[^"]*"/g, '');

function displayDate(date: string, locale: string, full = true) {
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...(full ? { weekday: 'long' } : {}), day: 'numeric', month: full ? 'long' : 'short', ...(full ? { year: 'numeric' } : {}) }).format(new Date(`${date}T12:00:00Z`));
}

export default function StepsScreen() {
  const theme = useTheme();
  const { scheme } = useAppearance();
  const { locale } = useI18n();
  const t = useTranslations(stepsMessages);
  const insets = useSafeAreaInsets();
  const { status, user } = useAuth();
  const today = useMemo(() => dateInHcm(), []);
  const [period, setPeriod] = useState<StepsPeriod>('day');
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(() => getMonday(today));
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; series: StepsSeries } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: 'sessionAttention' | 'loadFailed' } | null>(null);
  const [goalOverride, setGoalOverride] = useState<{ scopeKey: string; goal: StepsGoal | null; afterRetry: number } | null>(null);
  const [goalBusyScope, setGoalBusyScope] = useState<string | null>(null);
  const [goalFailure, setGoalFailure] = useState<{ scopeKey: string; message: 'goalSaveFailed' | 'goalRemoveFailed' } | null>(null);
  const [settledQueryKey, setSettledQueryKey] = useState<string | null>(null);
  const requestId = useRef(0);
  const goalMutationId = useRef(0);
  const sessionKey = `${status}:${user?.id ?? ''}`;
  const goalScopeKey = `${sessionKey}:${today}`;
  const activeGoalScope = useRef<string | null>(goalScopeKey);
  const goalDataKey = `${sessionKey}:day:${today}`;
  const dataKey = `${sessionKey}:${period}:${period === 'day' ? selectedDate : weekStart}`;
  const queryKey = `${dataKey}:${retry}`;
  const retryRef = useRef(0);
  const displayed = result?.key === dataKey ? result.series : null;
  const error = failure?.key === queryKey ? failure.message : null;
  const pending = status === 'authenticated' && settledQueryKey !== queryKey;
  const loading = pending && !displayed && !error;
  const refresh = useCallback(() => {
    const nextRetry = retryRef.current + 1;
    retryRef.current = nextRetry;
    setRetry(nextRetry);
  }, []);
  useHeartRateRefresh(refresh, period === 'day' && selectedDate === today ? 15_000 : undefined);
  const dates = useMemo(() => weekDates(selectedDate), [selectedDate]);
  const monday = getMonday(today);
  const canAdvance = period === 'day' ? shiftCalendarDate(selectedDate, 7) <= today : shiftCalendarDate(weekStart, 7) <= monday;
  const periodLabel = period === 'day'
    ? displayDate(selectedDate, locale)
    : t('weekRange', { start: displayDate(weekStart, locale, false), end: displayDate(shiftCalendarDate(weekStart, 6), locale, false) });
  const params = useMemo(() => period === 'day' ? { date: selectedDate } : { weekStartDate: weekStart }, [period, selectedDate, weekStart]);

  useEffect(() => {
    activeGoalScope.current = goalScopeKey;
    return () => { activeGoalScope.current = null; };
  }, [goalScopeKey]);

  useEffect(() => {
    const id = ++requestId.current;
    if (status !== 'authenticated') return;
    const controller = new AbortController();
    stepsApi.series(period, params, controller.signal)
      .then((series) => { if (id === requestId.current && !controller.signal.aborted) {
        setResult({ key: dataKey, series });
        setFailure(null);
        setSettledQueryKey(queryKey);
        if (dataKey === goalDataKey) setGoalOverride((current) => current?.scopeKey === goalScopeKey && retry >= current.afterRetry ? null : current);
      } })
      .catch((cause: unknown) => {
        if (id !== requestId.current || controller.signal.aborted) return;
        const message = cause instanceof ApiError && cause.status === 401 ? 'sessionAttention' : 'loadFailed';
        setFailure({ key: queryKey, message });
        setSettledQueryKey(queryKey);
      });
    return () => { controller.abort(); if (requestId.current === id) requestId.current += 1; };
  }, [status, user?.id, period, params, sessionKey, dataKey, queryKey, goalDataKey, goalScopeKey, retry]);

  const mutateGoal = useCallback(async (targetSteps: number | null): Promise<boolean> => {
    if (status !== 'authenticated') return false;
    const id = ++goalMutationId.current;
    setGoalBusyScope(goalScopeKey);
    setGoalFailure(null);
    try {
      let goal: StepsGoal | null;
      if (targetSteps === null) {
        await stepsApi.removeGoal();
        goal = null;
      } else goal = await stepsApi.setGoal(targetSteps);
      if (id !== goalMutationId.current || activeGoalScope.current !== goalScopeKey) return true;
      const nextRetry = retryRef.current + 1;
      retryRef.current = nextRetry;
      requestId.current += 1;
      setGoalOverride({ scopeKey: goalScopeKey, goal, afterRetry: nextRetry });
      setRetry(nextRetry);
      return true;
    } catch {
      if (id === goalMutationId.current && activeGoalScope.current === goalScopeKey) {
        setGoalFailure({ scopeKey: goalScopeKey, message: targetSteps === null ? 'goalRemoveFailed' : 'goalSaveFailed' });
      }
      return false;
    } finally {
      if (id === goalMutationId.current) setGoalBusyScope(null);
    }
  }, [goalScopeKey, status]);

  const movePeriod = (offset: number) => {
    if (period === 'day') {
      setSelectedDate((date) => shiftCalendarDate(date, offset * 7));
      setWeekStart((date) => shiftCalendarDate(date, offset * 7));
    } else setWeekStart((date) => shiftCalendarDate(date, offset * 7));
  };

  const acceptedCount = displayed?.buckets.reduce((count, bucket) => count + bucket.eventCount, 0) ?? 0;
  const populated = displayed?.buckets.filter((bucket) => bucket.steps != null && bucket.eventCount > 0) ?? [];
  const peak = populated.reduce<(typeof populated)[number] | null>((best, bucket) => !best || bucket.steps! > best.steps! ? bucket : best, null);
  const peakDetail = peak ? period === 'day'
    ? `${new Intl.DateTimeFormat(locale, { timeZone: displayed!.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(peak.startAt))}–${new Intl.DateTimeFormat(locale, { timeZone: displayed!.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(peak.endAt))}`
    : new Intl.DateTimeFormat(locale, { timeZone: displayed!.timezone, weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(peak.startAt))
    : '—';
  const stepPeakValue = peak ? t('stepValue', { count: peak.steps!.toLocaleString(locale) }) : '—';
  const refreshing = pending;
  const goalOverrideForDate = period === 'day' && selectedDate === today && goalOverride?.scopeKey === goalScopeKey ? goalOverride : null;
  const selectedGoal = goalOverrideForDate ? goalOverrideForDate.goal : displayed?.goal ?? null;
  const selectedGoalProgress = goalOverrideForDate ? null : displayed?.progressPercent ?? null;

  return <View style={{ flex: 1, backgroundColor: theme.background }}>
    <LinearGradient colors={scheme === 'dark' ? ['#202E2C', '#1B2726'] : ['#F5FCF8', '#E9F7F0']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none" />
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.steps} />} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg, paddingHorizontal: spacing.md }}>
      <View style={{ width: '100%', maxWidth: 620, alignSelf: 'center', gap: spacing.md }}>
        <HealthMetricsSidebar brandedHeader />
        <View style={{ gap: spacing.xs, marginBottom: spacing.xs }}>
          <ThemedText variant="labelStrong" themeColor="steps">{t('activity')}</ThemedText>
          <ThemedText variant="largeTitle">{t('steps')}</ThemedText>
          <ThemedText variant="body" themeColor="textSecondary">{t('description')}</ThemedText>
        </View>

        <View style={{ minHeight: 170, padding: spacing.lg, gap: spacing.xs, borderRadius: radius.xl, backgroundColor: theme.stepsSoft, borderWidth: 1, borderColor: theme.border, boxShadow: shadows.card, overflow: 'hidden', justifyContent: 'center' }}>
          <LinearGradient colors={scheme === 'dark' ? ['#2D423C', '#263A36'] : ['#F2FFF8', '#DFF7EB']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none" />
          <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '58%' }}><SvgXml xml={stepsArt.scenery} width="100%" height="100%" preserveAspectRatio="xMidYMax slice" /></View>
          <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', right: -4, top: 0, bottom: 0, width: '42%', opacity: scheme === 'dark' ? 0.92 : 1 }}><SvgXml xml={nativeSneakers} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" /></View>
          <View style={{ maxWidth: '54%', alignItems: 'flex-start', gap: spacing.xs }}>
            <ThemedText variant="caption" themeColor="steps">{t('periodTotal', { period: t(period) })}</ThemedText>
            {loading ? <View accessibilityRole="progressbar" accessibilityLabel={t('loadingLabel')} style={{ height: 44, width: 150, borderRadius: radius.md, backgroundColor: theme.backgroundElement }} /> : error && !displayed ? <View style={{ gap: spacing.xs }}><ThemedText variant="caption" themeColor="danger" accessibilityRole="alert">{t(error)}</ThemedText><Pressable accessibilityRole="button" onPress={refresh}><ThemedText variant="labelStrong" themeColor="steps">{t('retry')}</ThemedText></Pressable></View> : displayed ? <>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing.xs }}><ThemedText variant="display" style={{ fontVariant: ['tabular-nums'] }}>{displayed.totalSteps == null ? '—' : displayed.totalSteps.toLocaleString(locale)}</ThemedText><ThemedText variant="caption" themeColor="textSecondary">{t('stepsUnit')}</ThemedText></View>
              <ThemedText variant="caption" themeColor="textSecondary">{t('acceptedRecords', { count: acceptedCount.toLocaleString(locale) })}</ThemedText>
            </> : <ThemedText variant="body" themeColor="textSecondary">{t('signIn')}</ThemedText>}
            {error && displayed ? <View style={{ flexDirection: 'row', gap: spacing.xs }}><ThemedText variant="caption" themeColor="danger" accessibilityRole="alert">{t(error)}</ThemedText><Pressable accessibilityRole="button" onPress={refresh}><ThemedText variant="caption" themeColor="steps">{t('retry')}</ThemedText></Pressable></View> : null}
          </View>
        </View>

        {period === 'day' ? <StepsDailyGoal key={selectedDate} goal={selectedGoal} totalSteps={displayed?.totalSteps ?? null} progressPercent={selectedGoalProgress} date={selectedDate} today={today} busy={goalBusyScope === goalScopeKey} error={goalFailure?.scopeKey === goalScopeKey ? goalFailure.message : null} onSave={(targetSteps) => mutateGoal(targetSteps)} onRemove={() => mutateGoal(null)} /> : null}

        <View style={{ padding: spacing.md, gap: spacing.md, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}><SvgXml xml={stepsArt.chart.replace(/currentColor/g, theme.steps)} width={28} height={28} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" /><ThemedText variant="heading" style={{ flex: 1 }}>{t('analytics')}</ThemedText></View>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            {periods.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: period === item }} onPress={() => setPeriod(item)} style={{ flex: 1, minHeight: sizing.controlComfortable, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: period === item ? theme.steps : theme.backgroundSelected }}><ThemedText variant="labelStrong" themeColor={period === item ? 'onSteps' : 'textSecondary'}>{t(item)}</ThemedText></Pressable>)}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('previousWeek')} onPress={() => movePeriod(-1)} style={{ width: sizing.controlMin, minHeight: sizing.controlComfortable, justifyContent: 'center' }}><ThemedText variant="heading" themeColor="steps">‹</ThemedText></Pressable>
            <ThemedText variant="labelStrong" style={{ flex: 1, textAlign: 'center' }}>{periodLabel}</ThemedText>
            <Pressable accessibilityRole="button" accessibilityLabel={t('nextWeek')} accessibilityState={{ disabled: !canAdvance }} disabled={!canAdvance} onPress={() => movePeriod(1)} style={{ width: sizing.controlMin, minHeight: sizing.controlComfortable, alignItems: 'flex-end', justifyContent: 'center', opacity: canAdvance ? 1 : 0.35 }}><ThemedText variant="heading" themeColor="steps">›</ThemedText></Pressable>
          </View>
          {period === 'day' ? <View style={{ flexDirection: 'row', gap: spacing.xs }} accessibilityLabel={t('chooseDay')}>
            {dates.map((date) => {
              const selected = date === selectedDate;
              const future = isFutureHcmDate(date, today);
              const weekday = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'short' }).format(new Date(`${date}T12:00:00Z`));
              return <Pressable key={date} accessibilityRole="button" accessibilityLabel={displayDate(date, locale)} accessibilityState={{ selected, disabled: future }} disabled={future} onPress={() => setSelectedDate(date)} style={{ flex: 1, minWidth: 0, minHeight: sizing.controlComfortable, paddingHorizontal: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radius.md, backgroundColor: selected ? theme.accent : theme.backgroundSelected, opacity: future ? 0.45 : 1 }}><ThemedText variant="caption" themeColor={selected ? 'onAccent' : 'textSecondary'}>{weekday}</ThemedText><ThemedText variant="labelStrong" themeColor={selected ? 'onAccent' : 'text'}>{date.slice(-2)}</ThemedText></Pressable>;
            })}
          </View> : null}
          {loading ? <View accessibilityRole="progressbar" accessibilityLabel={t('loadingLabel')} style={{ minHeight: 240, justifyContent: 'center' }}><ThemedText variant="body" themeColor="textSecondary">{t('loading')}</ThemedText></View>
            : error && !displayed ? <View style={{ minHeight: 170, justifyContent: 'center', alignItems: 'flex-start', gap: spacing.sm }}><ThemedText variant="body" themeColor="danger" accessibilityRole="alert">{t(error)}</ThemedText><Pressable accessibilityRole="button" accessibilityLabel={t('retry')} onPress={refresh} style={{ minHeight: sizing.controlMin, justifyContent: 'center' }}><ThemedText variant="labelStrong" themeColor="steps">{t('retry')}</ThemedText></Pressable></View>
              : displayed ? <>
                <StepsDetailChart key={dataKey} series={displayed} period={period} />
                {error ? <ThemedText variant="caption" themeColor="danger" accessibilityRole="alert">{t(error)}</ThemedText> : null}
                <View style={{ width: '100%', minHeight: 108, padding: spacing.md, gap: spacing.sm, borderRadius: radius.md, backgroundColor: theme.stepsSoft, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}><SvgXml xml={stepsArt.crown.replace(/currentColor/g, theme.steps)} width={20} height={20} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" /><ThemedText variant="caption" themeColor="textSecondary">{period === 'day' ? t('peakHour') : t('peakDay')}</ThemedText></View>
                    {peak ? <><ThemedText variant="metricLarge" style={{ fontVariant: ['tabular-nums'] }}>{stepPeakValue}</ThemedText><ThemedText variant="caption" themeColor="textSecondary">{peakDetail}</ThemedText></> : <ThemedText variant="body" themeColor="textSecondary">{t('noStepsRange')}</ThemedText>}
                  </View>
                  <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 60, height: 56, alignItems: 'center', justifyContent: 'center' }}>
                    <Svg width={60} height={56} viewBox="0 0 60 56">
                      <Rect x={7} y={30} width={10} height={20} rx={5} fill={theme.stepsTrack} />
                      <Rect x={25} y={18} width={10} height={32} rx={5} fill={theme.steps} opacity={0.76} />
                      <Rect x={43} y={6} width={10} height={44} rx={5} fill={theme.accent} opacity={0.88} />
                    </Svg>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}><SvgXml xml={stepsArt.info.replace(/currentColor/g, theme.steps)} width={18} height={18} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" /><ThemedText variant="caption" themeColor="textSecondary" style={{ flex: 1 }}>{t('note')}</ThemedText></View>
              </> : <ThemedText variant="body" themeColor="textSecondary">{t('signIn')}</ThemedText>}
        </View>
      </View>
    </ScrollView>
  </View>;
}
