import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { HealthMetricsSidebar } from '@/components/ui/health-metrics-sidebar';
import { HeartRateFooter } from '@/components/ui/main-tab-bar';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, useTranslations } from '@/i18n';
import { radius, shadows, sizing, spacing } from '@/theme';
import { heartRateApi, type HeartRateSummary } from '../api/heart-rate-api';
import { useHeartRateRefresh } from '../hooks/use-heart-rate-refresh';
import { dateInHcm, isFutureHcmDate, weekDates } from '../utils/heart-rate-date';
import { heartRateMessages } from '../messages';

function dateLabel(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'short', day: '2-digit' }).format(new Date(`${date}T12:00:00Z`));
}
function localTimestamp(instant: string, locale: string) {
  const date = new Date(instant);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function HeartRateScreen() {
  const theme = useTheme();
  const { locale } = useI18n();
  const t = useTranslations(heartRateMessages);
  const insets = useSafeAreaInsets();
  const today = useMemo(() => dateInHcm(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekOffset, setWeekOffset] = useState(0);
  const [summary, setSummary] = useState<HeartRateSummary | null>(null);
  const [completedRequest, setCompletedRequest] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<{ key: string } | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const requestKey = `${selectedDate}:${retryKey}`;
  const loading = completedRequest !== requestKey && requestError?.key !== requestKey;
  const error = requestError?.key === requestKey ? t('loadFailed') : null;

  useEffect(() => {
    const controller = new AbortController();
    heartRateApi.summary(selectedDate, controller.signal)
      .then((result) => { if (!controller.signal.aborted) { setSummary(result); setCompletedRequest(requestKey); } })
      .catch(() => {
        if (controller.signal.aborted) return;
        setRequestError({ key: requestKey });
      });
    return () => controller.abort();
  }, [selectedDate, retryKey, requestKey]);

  const dates = useMemo(() => weekDates(today, weekOffset), [today, weekOffset]);
  const retry = useCallback(() => setRetryKey((value) => value + 1), []);
  useHeartRateRefresh(retry, selectedDate === today ? 15_000 : undefined);
  const statusCopy = summary?.dailyAverage.dataStatus === 'CURRENT_DAY_PARTIAL'
    ? { title: t('currentPartial'), detail: t('partialDetail') }
    : summary?.dailyAverage.dataStatus === 'HISTORY_VERIFIED'
      ? { title: t('verified'), detail: t('verifiedDetail') }
      : { title: t('unverified'), detail: t('unverifiedDetail') };

  return <View style={{ flex: 1, backgroundColor: theme.background }}>
    <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={retry} tintColor={theme.accent} />} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + spacing.md, paddingBottom: spacing.lg, paddingHorizontal: spacing.md }}>
      <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', gap: spacing.md }}>
        <HealthMetricsSidebar brandedHeader />
        <View style={{ alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs }}>
          <ThemedText variant="largeTitle">{t('heartRate')}</ThemedText>
          <ThemedText variant="body" themeColor="textSecondary" style={{ textAlign: 'center' }}>{t('description')}</ThemedText>
        </View>

        <View style={{ minHeight: 204, padding: spacing.lg, gap: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card }}>
          <ThemedText variant="heading" style={{ textAlign: 'center' }}>{t('latestTitle')}</ThemedText>
          {loading && !summary ? <View style={{ height: 48, width: 150, borderRadius: radius.md, backgroundColor: theme.accentSoft }} accessibilityRole="progressbar" accessibilityLabel={t('loadingLatest')} /> : !summary && error ? <ThemedText variant="body" themeColor="danger" accessibilityRole="alert">{t('loadFailed')}</ThemedText> : summary?.latestRecorded ? <>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: spacing.sm }}><ThemedText variant="metricLarge">{summary.latestRecorded.heartRateBpm.toLocaleString(locale)}</ThemedText><ThemedText variant="heading" themeColor="textSecondary">{t('bpm')}</ThemedText></View>
            <ThemedText variant="bodyStrong">{t('measuredAt', { time: localTimestamp(summary.latestRecorded.occurredAt, locale) ?? t('invalidTime') })}</ThemedText>
            <ThemedText variant="subhead" themeColor="textSecondary" style={{ textAlign: 'center' }}>{t('latestAccepted')}</ThemedText>
          </> : <ThemedText variant="body" themeColor="textSecondary" style={{ textAlign: 'center' }}>{t('noLatest')}</ThemedText>}
        </View>

        <View style={{ minHeight: 350, padding: spacing.md, gap: spacing.md, alignItems: 'center', borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
            <ThemedText variant="heading">▦</ThemedText><ThemedText variant="heading">{t('averageTitle')}</ThemedText>
          </View>
          <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('previousWeek')} onPress={() => setWeekOffset((value) => value - 1)} style={{ width: sizing.controlMin, minHeight: sizing.controlComfortable, alignItems: 'center', justifyContent: 'center' }}><ThemedText variant="heading" themeColor="accent">‹</ThemedText></Pressable>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', gap: 2 }} accessibilityLabel={t('selectDay')}>
              {dates.map((date) => {
                const selected = selectedDate === date;
                const future = isFutureHcmDate(date, today);
                return <Pressable key={date} accessibilityRole="button" accessibilityLabel={dateLabel(date, locale)} accessibilityState={{ selected, disabled: future }} disabled={future} onPress={() => setSelectedDate(date)} style={{ flex: 1, minWidth: 0, minHeight: sizing.controlComfortable, paddingHorizontal: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: selected ? theme.accent : future ? theme.backgroundSelected : theme.background, opacity: future ? 0.48 : 1 }}>
                  <ThemedText variant="caption" themeColor={selected ? 'onAccent' : 'textSecondary'}>{dateLabel(date, locale)}</ThemedText>
                </Pressable>;
              })}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={t('nextWeek')} accessibilityState={{ disabled: weekOffset >= 0 }} disabled={weekOffset >= 0} onPress={() => setWeekOffset((value) => Math.min(0, value + 1))} style={{ width: sizing.controlMin, minHeight: sizing.controlComfortable, alignItems: 'center', justifyContent: 'center', opacity: weekOffset >= 0 ? 0.35 : 1 }}><ThemedText variant="heading" themeColor="accent">›</ThemedText></Pressable>
          </View>
          <ThemedText variant="caption" themeColor="textSecondary">{t('rangeLabel', { start: new Intl.DateTimeFormat(locale, { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${dates[0]}T12:00:00Z`)), end: new Intl.DateTimeFormat(locale, { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${dates[6]}T12:00:00Z`)) })}</ThemedText>
          {summary ? <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: summary.dailyAverage.dataStatus === 'HISTORY_UNVERIFIED' ? theme.backgroundSelected : theme.accentSoft }}><ThemedText variant="caption" themeColor={summary.dailyAverage.dataStatus === 'HISTORY_UNVERIFIED' ? 'warning' : 'accent'}>{statusCopy.title}</ThemedText></View> : <View style={{ height: 30 }} />}
          <View style={{ minHeight: 96, alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
            {loading && !summary ? <View style={{ height: 48, width: 150, borderRadius: radius.md, backgroundColor: theme.accentSoft }} accessibilityRole="progressbar" accessibilityLabel={t('loadingDaily')} /> : error && !summary ? <ThemedText variant="body" themeColor="danger" accessibilityRole="alert" style={{ textAlign: 'center' }}>{t('loadFailed')}</ThemedText> : summary?.dailyAverage.heartRateBpm == null ? <ThemedText variant="body" themeColor="textSecondary" style={{ textAlign: 'center' }}>{t('noDayData')}</ThemedText> : <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: spacing.sm }}><ThemedText variant="metricLarge">{Number.isInteger(summary.dailyAverage.heartRateBpm) ? summary.dailyAverage.heartRateBpm.toLocaleString(locale) : summary.dailyAverage.heartRateBpm.toLocaleString(locale, { maximumFractionDigits: 1 })}</ThemedText><ThemedText variant="heading" themeColor="textSecondary">{t('bpm')}</ThemedText></View>}
          </View>
          {summary ? <ThemedText variant="subhead" themeColor="textSecondary" style={{ textAlign: 'center' }}>{statusCopy.detail}</ThemedText> : <View style={{ minHeight: 40 }} />}
        </View>
        {error ? <View style={{ alignItems: 'center', gap: spacing.xs }}><ThemedText variant="subhead" themeColor="danger" accessibilityRole="alert" style={{ textAlign: 'center' }}>{error}</ThemedText><Pressable accessibilityRole="button" accessibilityLabel={t('retry')} onPress={retry} style={{ minHeight: sizing.controlMin, justifyContent: 'center', paddingHorizontal: spacing.sm }}><ThemedText variant="bodyStrong" themeColor="accent">{t('retry')}</ThemedText></Pressable></View> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm }}>
          <ThemedText variant="heading" themeColor="accent">✓</ThemedText>
          <ThemedText variant="subhead" themeColor="textSecondary" style={{ flex: 1, textAlign: 'center' }}>{t('automaticallyRecorded')}</ThemedText>
        </View>
        <ThemedText variant="caption" themeColor="textSecondary" style={{ textAlign: 'center', paddingHorizontal: spacing.sm }}>{t('medicalNote')}</ThemedText>
      </View>
    </ScrollView>
    <HeartRateFooter />
  </View>;
}
