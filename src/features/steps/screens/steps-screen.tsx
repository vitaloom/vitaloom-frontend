import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
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
import { stepsApi, type StepsSeries } from '../api/steps-api';
import { StepsDetailChart } from '../components/steps-detail-chart';
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
  const [settledQueryKey, setSettledQueryKey] = useState<string | null>(null);
  const requestId = useRef(0);
  const sessionKey = `${status}:${user?.id ?? ''}`;
  const dataKey = `${sessionKey}:${period}:${period === 'day' ? selectedDate : weekStart}`;
  const queryKey = `${dataKey}:${retry}`;
  const displayed = result?.key === dataKey ? result.series : null;
  const error = failure?.key === queryKey ? failure.message : null;
  const pending = status === 'authenticated' && settledQueryKey !== queryKey;
  const loading = pending && !displayed && !error;
  const refresh = useCallback(() => setRetry((value) => value + 1), []);
  useHeartRateRefresh(refresh, period === 'day' && selectedDate === today ? 15_000 : undefined);
  const dates = useMemo(() => weekDates(selectedDate), [selectedDate]);
  const monday = getMonday(today);
  const canAdvance = period === 'day' ? shiftCalendarDate(selectedDate, 7) <= today : shiftCalendarDate(weekStart, 7) <= monday;
  const periodLabel = period === 'day'
    ? displayDate(selectedDate, locale)
    : t('weekRange', { start: displayDate(weekStart, locale, false), end: displayDate(shiftCalendarDate(weekStart, 6), locale, false) });
  const params = useMemo(() => period === 'day' ? { date: selectedDate } : { weekStartDate: weekStart }, [period, selectedDate, weekStart]);

  useEffect(() => {
    const id = ++requestId.current;
    if (status !== 'authenticated') return;
    const controller = new AbortController();
    stepsApi.series(period, params, controller.signal)
      .then((series) => { if (id === requestId.current && !controller.signal.aborted) { setResult({ key: dataKey, series }); setFailure(null); setSettledQueryKey(queryKey); } })
      .catch((cause: unknown) => {
        if (id !== requestId.current || controller.signal.aborted) return;
        const message = cause instanceof ApiError && cause.status === 401 ? 'sessionAttention' : 'loadFailed';
        setFailure({ key: queryKey, message });
        setSettledQueryKey(queryKey);
      });
    return () => { controller.abort(); if (requestId.current === id) requestId.current += 1; };
  }, [status, user?.id, period, params, sessionKey, dataKey, queryKey]);

  const movePeriod = (offset: number) => {
    if (period === 'day') {
      setSelectedDate((date) => shiftCalendarDate(date, offset * 7));
      setWeekStart((date) => shiftCalendarDate(date, offset * 7));
    } else setWeekStart((date) => shiftCalendarDate(date, offset * 7));
  };

  const acceptedCount = displayed?.buckets.reduce((count, bucket) => count + bucket.eventCount, 0) ?? 0;
  const populated = displayed?.buckets.filter((bucket) => bucket.steps != null && bucket.eventCount > 0) ?? [];
  const peak = populated.reduce<(typeof populated)[number] | null>((best, bucket) => !best || bucket.steps! > best.steps! ? bucket : best, null);
  const refreshing = pending;

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
          <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '82%' }}><SvgXml xml={stepsArt.scenery} width="100%" height="100%" preserveAspectRatio="xMidYMax slice" /></View>
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
          {period === 'day' ? <ThemedText variant="caption" themeColor="textSecondary">{periodLabel}</ThemedText> : null}

          {loading ? <View accessibilityRole="progressbar" accessibilityLabel={t('loadingLabel')} style={{ minHeight: 240, justifyContent: 'center' }}><ThemedText variant="body" themeColor="textSecondary">{t('loading')}</ThemedText></View>
            : error && !displayed ? <View style={{ minHeight: 170, justifyContent: 'center', alignItems: 'flex-start', gap: spacing.sm }}><ThemedText variant="body" themeColor="danger" accessibilityRole="alert">{t(error)}</ThemedText><Pressable accessibilityRole="button" accessibilityLabel={t('retry')} onPress={refresh} style={{ minHeight: sizing.controlMin, justifyContent: 'center' }}><ThemedText variant="labelStrong" themeColor="steps">{t('retry')}</ThemedText></Pressable></View>
              : displayed ? <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}><SvgXml xml={stepsArt.clock.replace(/currentColor/g, theme.steps)} width={18} height={18} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" /><ThemedText variant="caption" themeColor="textSecondary">{displayed.timezone} · {period === 'day' ? '60 min' : '1440 min'}</ThemedText></View>
                <StepsDetailChart key={dataKey} series={displayed} period={period} />
                {error ? <ThemedText variant="caption" themeColor="danger" accessibilityRole="alert">{t(error)}</ThemedText> : null}
                <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                  {[{ title: period === 'day' ? t('peakHour') : t('peakDay'), value: peak ? `${period === 'day' ? new Intl.DateTimeFormat(locale, { timeZone: displayed.timezone, hour: '2-digit', hourCycle: 'h23' }).format(new Date(peak.startAt)) : new Intl.DateTimeFormat(locale, { timeZone: displayed.timezone, weekday: 'short', day: 'numeric' }).format(new Date(peak.startAt))} · ${peak.steps!.toLocaleString(locale)}` : '—', icon: stepsArt.crown }, { title: t('intervalsWithRecords', { count: populated.length.toLocaleString(locale) }), value: `${populated.length.toLocaleString(locale)} / ${displayed.buckets.length.toLocaleString(locale)}`, icon: stepsArt.records }].map((item, index) => <View key={index} style={{ flex: 1, minHeight: 86, padding: spacing.sm, gap: spacing.xs, borderRadius: radius.md, backgroundColor: theme.stepsSoft }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}><SvgXml xml={item.icon.replace(/currentColor/g, theme.steps)} width={20} height={20} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" /><ThemedText variant="caption" themeColor="textSecondary" style={{ flexShrink: 1 }}>{item.title}</ThemedText></View>
                    <ThemedText variant="labelStrong">{item.value}</ThemedText>
                  </View>)}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}><SvgXml xml={stepsArt.info.replace(/currentColor/g, theme.steps)} width={18} height={18} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" /><ThemedText variant="caption" themeColor="textSecondary" style={{ flex: 1 }}>{t('note')}</ThemedText></View>
              </> : <ThemedText variant="body" themeColor="textSecondary">{t('signIn')}</ThemedText>}
        </View>
      </View>
    </ScrollView>
  </View>;
}
