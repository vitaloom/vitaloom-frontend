import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/features/auth/store/auth-context';
import { HealthMetricsSidebar } from '@/components/ui/health-metrics-sidebar';
import { HeartRateFooter } from '@/components/ui/main-tab-bar';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, useTranslations } from '@/i18n';
import { radius, shadows, sizing, spacing } from '@/theme';
import { heartRateApi, type HeartRateSeries, type HeartRateSummary } from '../api/heart-rate-api';
import { HeartRateRangeChart } from '../components/heart-rate-range-chart';
import { useHeartRateRefresh } from '../hooks/use-heart-rate-refresh';
import { aggregateHeartRateSeries, type HeartRateAnalyticsPeriod } from '../utils/heart-rate-analytics';
import { dateInHcm, getMonday, isFutureHcmDate, shiftCalendarDate, validateHeartRateRange, weekDates } from '../utils/heart-rate-date';
import { heartRateMessages } from '../messages';

type RequestFailure = { key: string } | null;
const periods: { id: HeartRateAnalyticsPeriod; label: 'day' | 'week' | 'custom' }[] = [
  { id: 'day', label: 'day' }, { id: 'week', label: 'week' }, { id: 'custom', label: 'custom' },
];

function localTimestamp(instant: string, locale: string) {
  const date = new Date(instant);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
function displayDate(date: string, locale: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options }).format(new Date(`${date}T12:00:00Z`));
}

export default function HeartRateScreen() {
  const theme = useTheme();
  const { locale } = useI18n();
  const t = useTranslations(heartRateMessages);
  const insets = useSafeAreaInsets();
  const { status: authStatus, user } = useAuth();
  const today = useMemo(() => dateInHcm(), []);
  const currentWeekStart = useMemo(() => getMonday(today), [today]);
  const [period, setPeriod] = useState<HeartRateAnalyticsPeriod>('day');
  const [dayDate, setDayDate] = useState(today);
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const [customStart, setCustomStart] = useState(shiftCalendarDate(today, -1));
  const [customEnd, setCustomEnd] = useState(today);
  const [summary, setSummary] = useState<{ accountKey: string; dateKey: string; value: HeartRateSummary } | null>(null);
  const [series, setSeries] = useState<{ dataKey: string; value: HeartRateSeries } | null>(null);
  const [summaryFailure, setSummaryFailure] = useState<RequestFailure>(null);
  const [seriesFailure, setSeriesFailure] = useState<RequestFailure>(null);
  const [settledSummaryKey, setSettledSummaryKey] = useState<string | null>(null);
  const [settledSeriesKey, setSettledSeriesKey] = useState<string | null>(null);
  const [summaryRetry, setSummaryRetry] = useState(0);
  const [seriesRetry, setSeriesRetry] = useState(0);
  const summaryRequestId = useRef(0);
  const seriesRequestId = useRef(0);

  const accountKey = `${authStatus}:${user?.id ?? ''}`;
  const customRangeError = period === 'custom' ? validateHeartRateRange(customStart, customEnd, today) : null;
  const params = useMemo(() => period === 'day' ? { date: dayDate }
    : period === 'week' ? { weekStartDate: weekStart }
      : { startDate: customStart, endDate: customEnd }, [period, dayDate, weekStart, customStart, customEnd]);
  const summaryDataKey = `${accountKey}:${dayDate}`;
  const summaryRequestKey = `${summaryDataKey}:${summaryRetry}`;
  const seriesDataKey = `${accountKey}:${period}:${JSON.stringify(params)}`;
  const seriesRequestKey = `${seriesDataKey}:${seriesRetry}`;
  const latestSummary = summary?.accountKey === accountKey ? summary.value : null;
  const dailySummary = summary?.dateKey === summaryDataKey ? summary.value : null;
  const summaryLoading = authStatus === 'authenticated' && settledSummaryKey !== summaryRequestKey && summaryFailure?.key !== summaryRequestKey;
  const seriesLoading = authStatus === 'authenticated' && !customRangeError && settledSeriesKey !== seriesRequestKey && seriesFailure?.key !== seriesRequestKey;
  const summaryError = summaryFailure?.key === summaryRequestKey;
  const seriesError = seriesFailure?.key === seriesRequestKey;
  const displayedSeries = series?.dataKey === seriesDataKey ? series.value : null;
  const analytics = useMemo(() => displayedSeries ? aggregateHeartRateSeries(displayedSeries, period) : null, [displayedSeries, period]);
  const dayRange = useMemo(() => weekDates(dayDate), [dayDate]);
  const periodLabel = period === 'day' ? displayDate(dayDate, locale)
    : period === 'week' ? `${displayDate(weekStart, locale)} — ${displayDate(shiftCalendarDate(weekStart, 6), locale)}`
      : `${displayDate(customStart, locale)} — ${displayDate(customEnd, locale)}`;

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    const id = ++summaryRequestId.current;
    const controller = new AbortController();
    heartRateApi.summary(dayDate, controller.signal)
      .then((value) => {
        if (controller.signal.aborted || id !== summaryRequestId.current) return;
        setSummary({ accountKey, dateKey: summaryDataKey, value });
        setSummaryFailure(null);
        setSettledSummaryKey(summaryRequestKey);
      })
      .catch(() => {
        if (controller.signal.aborted || id !== summaryRequestId.current) return;
        setSummaryFailure({ key: summaryRequestKey });
        setSettledSummaryKey(summaryRequestKey);
      });
    return () => { controller.abort(); if (summaryRequestId.current === id) summaryRequestId.current += 1; };
  }, [authStatus, accountKey, dayDate, summaryDataKey, summaryRequestKey]);

  useEffect(() => {
    if (authStatus !== 'authenticated' || customRangeError) return;
    const id = ++seriesRequestId.current;
    const controller = new AbortController();
    heartRateApi.series(period, params, controller.signal)
      .then((value) => {
        if (controller.signal.aborted || id !== seriesRequestId.current) return;
        setSeries({ dataKey: seriesDataKey, value });
        setSeriesFailure(null);
        setSettledSeriesKey(seriesRequestKey);
      })
      .catch(() => {
        if (controller.signal.aborted || id !== seriesRequestId.current) return;
        setSeriesFailure({ key: seriesRequestKey });
        setSettledSeriesKey(seriesRequestKey);
      });
    return () => { controller.abort(); if (seriesRequestId.current === id) seriesRequestId.current += 1; };
  }, [authStatus, customRangeError, period, params, seriesDataKey, seriesRequestKey]);

  const retrySummary = useCallback(() => setSummaryRetry((value) => value + 1), []);
  const retrySeries = useCallback(() => setSeriesRetry((value) => value + 1), []);
  const refreshAll = useCallback(() => { retrySummary(); retrySeries(); }, [retrySummary, retrySeries]);
  useHeartRateRefresh(refreshAll, dayDate === today ? 15_000 : undefined);

  const rangeErrorMessage = customRangeError === 'invalidDates' ? t('invalidRangeDates')
    : customRangeError === 'orderDates' ? t('rangeOrderError')
      : customRangeError === 'futureEnd' ? t('rangeFutureError')
        : customRangeError === 'maxRange' ? t('rangeLimitError') : null;
  const dailyStatus = dailySummary?.dailyAverage.dataStatus;
  const statusCopy = dailyStatus === 'CURRENT_DAY_PARTIAL'
    ? { title: t('currentPartial'), detail: t('partialDetail') }
    : dailyStatus === 'HISTORY_VERIFIED'
      ? { title: t('verified'), detail: t('verifiedDetail') }
      : { title: t('unverified'), detail: t('unverifiedDetail') };
  const minValue = analytics?.minBpm;
  const meanValue = analytics?.avgBpm;
  const maxValue = analytics?.maxBpm;
  const canAdvanceDayWeek = !isFutureHcmDate(shiftCalendarDate(dayDate, 7), today);
  const canAdvanceWeek = weekStart < currentWeekStart;
  const periodKey = seriesRequestKey;
  const refreshing = summaryLoading || seriesLoading;

  return <View style={{ flex: 1, backgroundColor: theme.background }}>
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={theme.heartRate} />} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + spacing.md, paddingBottom: spacing.lg, paddingHorizontal: spacing.md }}>
      <View style={{ width: '100%', maxWidth: 620, alignSelf: 'center', gap: spacing.md }}>
        <HealthMetricsSidebar brandedHeader />
        <View style={{ gap: spacing.xs, marginBottom: spacing.xs }}>
          <ThemedText variant="labelStrong" themeColor="heartRate">{t('wellness')}</ThemedText>
          <ThemedText variant="largeTitle">{t('heartRate')}</ThemedText>
          <ThemedText variant="body" themeColor="textSecondary">{t('description')}</ThemedText>
        </View>

        <View style={{ minHeight: 190, padding: spacing.lg, gap: spacing.xs, borderRadius: radius.xl, backgroundColor: theme.heartRateSoft, borderWidth: 1, borderColor: theme.border, boxShadow: shadows.card }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
            <ThemedText variant="heading" themeColor="heartRate">♥</ThemedText>
            <ThemedText variant="heading">{t('latestTitle')}</ThemedText>
          </View>
          {summaryLoading && !latestSummary ? <View accessibilityRole="progressbar" accessibilityLabel={t('loadingLatest')} style={{ height: 50, width: 150, alignSelf: 'center', borderRadius: radius.md, backgroundColor: theme.backgroundElement }} /> : latestSummary?.latestRecorded ? <>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: spacing.sm }}><ThemedText variant="display">{latestSummary.latestRecorded.heartRateBpm.toLocaleString(locale)}</ThemedText><ThemedText variant="heading" themeColor="textSecondary">{t('bpm')}</ThemedText></View>
            <ThemedText variant="bodyStrong" style={{ textAlign: 'center' }}>{t('measuredAt', { time: localTimestamp(latestSummary.latestRecorded.occurredAt, locale) ?? t('invalidTime') })}</ThemedText>
            <ThemedText variant="caption" themeColor="textSecondary" style={{ textAlign: 'center' }}>{t('latestAccepted')}</ThemedText>
          </> : summaryError && !latestSummary ? <View style={{ alignItems: 'center', gap: spacing.xs }}><ThemedText variant="body" themeColor="danger" accessibilityRole="alert">{t('loadFailed')}</ThemedText><Pressable accessibilityRole="button" onPress={retrySummary} style={{ minHeight: sizing.controlMin, justifyContent: 'center', paddingHorizontal: spacing.md }}><ThemedText variant="labelStrong" themeColor="accent">{t('retry')}</ThemedText></Pressable></View> : <ThemedText variant="body" themeColor="textSecondary" style={{ textAlign: 'center' }}>{t('noLatest')}</ThemedText>}
          {summaryError && latestSummary?.latestRecorded ? <View style={{ alignItems: 'center', gap: spacing.xs }}><ThemedText variant="caption" themeColor="danger" accessibilityRole="alert">{t('loadFailed')}</ThemedText><Pressable accessibilityRole="button" onPress={retrySummary} style={{ minHeight: sizing.controlMin, justifyContent: 'center', paddingHorizontal: spacing.md }}><ThemedText variant="labelStrong" themeColor="accent">{t('retry')}</ThemedText></Pressable></View> : null}
        </View>

        <View style={{ padding: spacing.md, gap: spacing.md, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card }}>
          <ThemedText variant="heading" style={{ textAlign: 'left' }}>{t('analysisTitle')}</ThemedText>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            {periods.map(({ id, label }) => <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: period === id }} onPress={() => setPeriod(id)} style={{ minHeight: sizing.controlComfortable, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: period === id ? theme.heartRate : theme.backgroundSelected }}><ThemedText variant="labelStrong" themeColor={period === id ? 'onHeartRate' : 'textSecondary'}>{t(label)}</ThemedText></Pressable>)}
          </View>

          {period === 'custom' ? <View style={{ gap: spacing.xs }}>
            <ThemedText variant="caption" themeColor="textSecondary">{t('customDates')}</ThemedText>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TextInput accessibilityLabel={t('customStart')} value={customStart} onChangeText={setCustomStart} placeholder={t('rangeStart')} placeholderTextColor={theme.textSecondary} autoCapitalize="none" style={{ minHeight: sizing.controlComfortable, flex: 1, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: customRangeError ? theme.danger : theme.border, borderRadius: radius.md, color: theme.text, backgroundColor: theme.background }} />
              <TextInput accessibilityLabel={t('customEnd')} value={customEnd} onChangeText={setCustomEnd} placeholder={t('rangeEnd')} placeholderTextColor={theme.textSecondary} autoCapitalize="none" style={{ minHeight: sizing.controlComfortable, flex: 1, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: customRangeError ? theme.danger : theme.border, borderRadius: radius.md, color: theme.text, backgroundColor: theme.background }} />
            </View>
            {rangeErrorMessage ? <ThemedText variant="caption" themeColor="danger" accessibilityRole="alert">{rangeErrorMessage}</ThemedText> : null}
          </View> : <View style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Pressable accessibilityRole="button" accessibilityLabel={t('previousPeriod', { period: t(period) })} onPress={() => period === 'day' ? setDayDate((value) => shiftCalendarDate(value, -7)) : setWeekStart((value) => shiftCalendarDate(value, -7))} style={{ width: sizing.controlMin, minHeight: sizing.controlComfortable, justifyContent: 'center' }}><ThemedText variant="heading" themeColor="heartRate">‹</ThemedText></Pressable>
              <ThemedText variant="labelStrong" style={{ flex: 1, textAlign: 'center' }}>{periodLabel}</ThemedText>
              <Pressable accessibilityRole="button" accessibilityLabel={t('nextPeriod', { period: t(period) })} accessibilityState={{ disabled: period === 'day' ? !canAdvanceDayWeek : !canAdvanceWeek }} disabled={period === 'day' ? !canAdvanceDayWeek : !canAdvanceWeek} onPress={() => period === 'day' ? setDayDate((value) => shiftCalendarDate(value, 7)) : setWeekStart((value) => shiftCalendarDate(value, 7))} style={{ width: sizing.controlMin, minHeight: sizing.controlComfortable, alignItems: 'flex-end', justifyContent: 'center', opacity: (period === 'day' ? canAdvanceDayWeek : canAdvanceWeek) ? 1 : 0.35 }}><ThemedText variant="heading" themeColor="heartRate">›</ThemedText></Pressable>
            </View>
            {period === 'day' ? <View style={{ flexDirection: 'row', gap: spacing.xs }} accessibilityLabel={t('selectDay')}>
              {dayRange.map((date) => {
                const selected = dayDate === date;
                const future = isFutureHcmDate(date, today);
                return <Pressable key={date} accessibilityRole="button" accessibilityLabel={displayDate(date, locale, { weekday: 'long', day: 'numeric', month: 'long' })} accessibilityState={{ selected, disabled: future }} disabled={future} onPress={() => setDayDate(date)} style={{ minWidth: 0, minHeight: sizing.controlComfortable, flex: 1, paddingHorizontal: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: selected ? theme.accent : future ? theme.backgroundSelected : theme.background, opacity: future ? 0.45 : 1 }}>
                  <ThemedText variant="caption" themeColor={selected ? 'onAccent' : 'textSecondary'}>{displayDate(date, locale, { weekday: 'short' })}</ThemedText>
                  <ThemedText variant="labelStrong" themeColor={selected ? 'onAccent' : 'text'}>{displayDate(date, locale, { day: 'numeric' })}</ThemedText>
                </Pressable>;
              })}
            </View> : null}
          </View>}

          {period === 'day' ? <View style={{ padding: spacing.md, gap: spacing.xs, borderRadius: radius.lg, backgroundColor: theme.backgroundSelected }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}><ThemedText variant="heading" themeColor="heartRate">♥</ThemedText><ThemedText variant="labelStrong">{t('dailyAverageTitle')}</ThemedText></View>
            {summaryLoading && !dailySummary ? <View accessibilityRole="progressbar" accessibilityLabel={t('loadingDaily')} style={{ height: 42, width: 138, borderRadius: radius.md, backgroundColor: theme.accentSoft }} /> : summaryError ? <View style={{ alignItems: 'flex-start', gap: spacing.xs }}><ThemedText variant="body" themeColor="danger" accessibilityRole="alert">{t('loadFailed')}</ThemedText><Pressable accessibilityRole="button" onPress={retrySummary} style={{ minHeight: sizing.controlMin, justifyContent: 'center' }}><ThemedText variant="labelStrong" themeColor="accent">{t('retry')}</ThemedText></Pressable></View> : dailySummary?.dailyAverage.heartRateBpm == null ? <ThemedText variant="body" themeColor="textSecondary">{t('noDayData')}</ThemedText> : <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}><ThemedText variant="metricLarge">{dailySummary.dailyAverage.heartRateBpm.toLocaleString(locale, { maximumFractionDigits: 1 })}</ThemedText><ThemedText variant="heading" themeColor="textSecondary">{t('bpm')}</ThemedText></View>}
            {dailySummary && !summaryError ? <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: spacing.sm, rowGap: spacing.xs }}><ThemedText variant="labelStrong" themeColor={dailyStatus === 'HISTORY_UNVERIFIED' ? 'warning' : 'accent'}>{statusCopy.title}</ThemedText><ThemedText variant="caption" themeColor="textSecondary">{statusCopy.detail}</ThemedText></View> : null}
          </View> : <View style={{ padding: spacing.md, gap: spacing.xs, alignItems: 'center', borderRadius: radius.lg, backgroundColor: theme.backgroundSelected }}>
            <ThemedText variant="caption" themeColor="textSecondary">{period === 'week' ? t('weekAverageTitle') : t('customAverageTitle')}</ThemedText>
            {seriesLoading && !displayedSeries ? <View accessibilityRole="progressbar" accessibilityLabel={t('seriesLoading')} style={{ height: 42, width: 138, borderRadius: radius.md, backgroundColor: theme.accentSoft }} /> : seriesError && !displayedSeries ? <ThemedText variant="body" themeColor="danger" accessibilityRole="alert" style={{ textAlign: 'center' }}>{t('seriesLoadFailed')}</ThemedText> : analytics?.avgBpm == null ? <ThemedText variant="body" themeColor="textSecondary">{t('noPeriodAverage')}</ThemedText> : <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}><ThemedText variant="metricLarge">{analytics.avgBpm.toLocaleString(locale, { maximumFractionDigits: 1 })}</ThemedText><ThemedText variant="heading" themeColor="textSecondary">{t('bpm')}</ThemedText></View>}
          </View>}

          <View style={{ gap: spacing.xs }}>
            <ThemedText variant="labelStrong">{t('periodOverview', { period: t(period) })}</ThemedText>
            {seriesLoading && !displayedSeries ? <View accessibilityRole="progressbar" accessibilityLabel={t('seriesLoading')} style={{ height: 210, borderRadius: radius.md, backgroundColor: theme.accentSoft }} /> : seriesError && !displayedSeries ? <View style={{ minHeight: 170, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}><ThemedText variant="body" themeColor="danger" accessibilityRole="alert" style={{ textAlign: 'center' }}>{t('seriesLoadFailed')}</ThemedText><Pressable accessibilityRole="button" onPress={retrySeries} style={{ minHeight: sizing.controlMin, justifyContent: 'center', paddingHorizontal: spacing.md }}><ThemedText variant="labelStrong" themeColor="accent">{t('retry')}</ThemedText></Pressable></View> : displayedSeries && analytics ? <>
              <ThemedText variant="caption" themeColor="textSecondary">{t('bpm')}</ThemedText>
              <HeartRateRangeChart key={periodKey} buckets={analytics.buckets} period={period} />
              {seriesError ? <View style={{ gap: spacing.xs }}><ThemedText variant="caption" themeColor="danger" accessibilityRole="alert">{t('seriesLoadFailed')}</ThemedText><Pressable accessibilityRole="button" onPress={retrySeries} style={{ minHeight: sizing.controlMin, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: spacing.xs }}><ThemedText variant="labelStrong" themeColor="accent">{t('retry')}</ThemedText></Pressable></View> : null}
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                {[{ label: 'minimum', value: minValue }, { label: 'average', value: meanValue }, { label: 'maximum', value: maxValue }].map((item) => <View key={item.label} style={{ flex: 1, minHeight: 84, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, padding: spacing.sm, borderRadius: radius.md, backgroundColor: theme.heartRateSoft }}>
                  <ThemedText variant="caption" themeColor="textSecondary" style={{ textAlign: 'center' }}>{t(item.label as 'minimum' | 'average' | 'maximum')}</ThemedText>
                  <ThemedText variant="labelStrong" themeColor={item.value == null ? 'textSecondary' : 'text'}>{item.value == null ? '—' : item.value.toLocaleString(locale, { maximumFractionDigits: 1 })}</ThemedText>
                  <ThemedText variant="caption" themeColor="textSecondary">{t('bpm')}</ThemedText>
                </View>)}
              </View>
              <ThemedText variant="caption" themeColor="textSecondary" style={{ textAlign: 'center' }}>{t('periodCount', { samples: analytics.sampleCount.toLocaleString(locale), observed: analytics.nonemptyBucketCount.toLocaleString(locale), total: analytics.buckets.length.toLocaleString(locale) })}</ThemedText>
            </> : null}
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm }}>
          <ThemedText variant="heading" themeColor="heartRate">♥</ThemedText>
          <ThemedText variant="subhead" themeColor="textSecondary" style={{ flex: 1, textAlign: 'center' }}>{t('automaticallyRecorded')}</ThemedText>
        </View>
        <ThemedText variant="caption" themeColor="textSecondary" style={{ textAlign: 'center', paddingHorizontal: spacing.sm }}>{t('medicalNote')}</ThemedText>
      </View>
    </ScrollView>
    <HeartRateFooter />
  </View>;
}
