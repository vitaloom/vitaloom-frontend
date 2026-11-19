import { router, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { CircularProgress } from '@/components/ui/circular-progress';
import { MiniBarChart } from '@/components/ui/mini-bar-chart';
import { WellnessIcon } from '@/components/ui/wellness-icon';
import { useTheme } from '@/hooks/use-theme';
import { radius, shadows } from '@/theme';
import { type MetricSummary } from '../data/dashboard';
import { useI18n, useTranslations } from '@/i18n';
import { homeMessages } from '../messages';

export type HeartRateTile = { state: 'loading' | 'error' | 'empty' | 'ready'; bpm?: number; occurredAt?: string };
export type StepsTile = { state: 'loading' | 'error' | 'empty' | 'ready'; totalSteps?: number | null; goal?: number; progressPercent?: number | null; buckets?: (number | null)[] };

export type SleepTile = { state: 'loading' | 'error' | 'empty' } | { state: 'ready'; minutes: number; goal: number | null };
export type WaterSummary = { totalMl: number; goalMl: number; logs: { id: string; amountMl: number; loggedAt: string }[] };
export type WaterTile = { state: 'loading' | 'error' | 'empty' } | { state: 'ready'; summary: WaterSummary };

export function MetricCard({ metric, compact, heartRate, steps, sleep, water, onRetry }: { metric: MetricSummary; compact: boolean; heartRate?: HeartRateTile; steps?: StepsTile; sleep?: SleepTile; water?: WaterTile; onRetry?: () => void }) {
  const theme = useTheme();
  const { locale } = useI18n();
  const t = useTranslations(homeMessages);
  const metricLabelKey = {
    steps: 'home.metric.steps',
    'heart-rate': 'home.metric.heartRate',
    water: 'home.metric.water',
    sleep: 'home.metric.sleep',
  } as const;
  const metricLabel = t(metricLabelKey[metric.key]);
  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const accent = metric.key === 'steps' ? theme.steps : metric.key === 'heart-rate' ? theme.heartRate : metric.key === 'water' ? theme.water : theme.sleep;
  const soft = metric.key === 'steps' ? theme.stepsSoft : metric.key === 'heart-rate' ? theme.heartRateSoft : metric.key === 'water' ? theme.waterPanel : theme.sleepSoft;
  const chartColor = accent;
  const heartRateError = metric.key === 'heart-rate' && heartRate?.state === 'error';
  const stepsError = metric.key === 'steps' && steps?.state === 'error';
  const stepsReady = metric.key === 'steps' && steps?.state === 'ready';
  const stepsTotal = stepsReady ? steps?.totalSteps ?? null : null;
  const stepsGoal = stepsReady ? steps?.goal ?? null : null;
  const sleepError = metric.key === 'sleep' && sleep?.state === 'error';
  const waterError = metric.key === 'water' && water?.state === 'error';
  const waterReady = metric.key === 'water' && water?.state === 'ready';
  const waterSummary = waterReady ? water.summary : null;
  const failed = heartRateError || stepsError || sleepError || waterError;
  const sleepValue = sleep?.state === 'ready'
    ? t('home.metric.sleepValue', { hours: Math.floor(sleep.minutes / 60), minutes: sleep.minutes % 60 })
    : sleep?.state === 'loading' ? '…' : sleepError ? '!' : '—';
  const sleepCaption = sleep?.state === 'ready' ? t('home.metric.sleepRecorded')
    : sleep?.state === 'loading' ? t('home.metric.loading')
    : sleepError ? t('home.metric.retry') : t('home.metric.sleepEmpty');
  const waterLitres = waterSummary ? numberFormat.format(waterSummary.totalMl / 1000) : null;
  const waterGoalLitres = waterSummary ? numberFormat.format(waterSummary.goalMl / 1000) : null;
  const value = metric.key === 'heart-rate' ? heartRate?.state === 'ready' ? `${heartRate.bpm}` : heartRate?.state === 'loading' ? '…' : heartRate?.state === 'empty' ? '—' : '!' : metric.key === 'steps' ? steps?.state === 'ready' ? steps.totalSteps == null ? t('home.metric.stepsEmpty') : steps.totalSteps.toLocaleString(locale) : steps?.state === 'loading' ? '…' : steps?.state === 'error' ? '!' : '—' : metric.key === 'water' ? waterLitres != null ? `${waterLitres} L` : water?.state === 'loading' ? '…' : waterError ? '!' : '—' : sleepValue;
  const secondary = metric.key === 'heart-rate' ? heartRate?.state === 'ready' && heartRate.occurredAt ? t('home.metric.heartRateAt', { time: new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date(heartRate.occurredAt)) }) : heartRate?.state === 'loading' ? t('home.metric.loading') : heartRate?.state === 'error' ? t('home.metric.retry') : heartRate?.state === 'empty' ? t('home.metric.noMeasurement') : '' : metric.key === 'steps' ? steps?.state === 'ready' ? steps.totalSteps == null ? steps.goal != null ? t('home.metric.stepsGoalDaily', { goal: steps.goal.toLocaleString(locale) }) : t('home.metric.stepsEmpty') : t('home.metric.stepsRecordedValue') : steps?.state === 'loading' ? t('home.metric.loading') : steps?.state === 'error' ? t('home.metric.retry') : steps?.state === 'empty' ? t('home.metric.stepsEmpty') : '' : metric.key === 'water' ? waterGoalLitres != null ? `/ ${waterGoalLitres} L` : waterError ? t('home.metric.retry') : t('home.metric.loading') : sleepCaption;
  const accessibleValue = metric.key === 'steps' && stepsTotal != null && stepsGoal != null ? `${stepsTotal.toLocaleString(locale)} / ${stepsGoal.toLocaleString(locale)} ${t('home.metric.stepsUnit')}` : metric.key === 'water' && waterSummary ? `${numberFormat.format(waterSummary.totalMl)} / ${numberFormat.format(waterSummary.goalMl)} ml` : value;
  const waterEventTimes = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  const accessibilityLabel = failed ? t('home.metric.unavailable', { metric: metricLabel })
    : metric.key === 'water' && waterSummary ? t('home.metric.waterCardLabel', {
      total: waterLitres ?? '',
      goal: waterGoalLitres ?? '',
      events: waterSummary.logs.length ? waterSummary.logs.map((log) => `${waterEventTimes.format(new Date(log.loggedAt))}: ${numberFormat.format(log.amountMl)} ml`).join(', ') : t('home.metric.waterEmpty'),
    })
      : t('home.metric.cardLabel', { metric: metricLabel, value: accessibleValue, secondary });
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={() => failed ? onRetry?.() : router.push(metric.route as Href)} style={({ pressed }) => ({ width: '48.5%', minHeight: compact ? 143 : 151, padding: compact ? 12 : 14, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card, opacity: pressed ? 0.78 : 1, overflow: 'hidden' })}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 31, height: 31, borderRadius: 16, backgroundColor: soft, alignItems: 'center', justifyContent: 'center' }}>
        <WellnessIcon name={metric.key} color={accent} size={19} />
      </View>
      <Text style={{ color: theme.text, fontSize: compact ? 14 : 15, fontWeight: '600', flex: 1 }} numberOfLines={1}>{metricLabel}</Text>
      <WellnessIcon name="chevron" color={theme.textSecondary} size={16} />
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: compact ? 8 : 10, minHeight: 54 }}>
      <View style={{ flexShrink: 1 }}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: failed ? theme.danger : theme.text, fontSize: metric.key === 'sleep' ? (compact ? 23 : 25) : compact ? 27 : 30, lineHeight: 34, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{value}{metric.key === 'heart-rate' && heartRate?.state === 'ready' ? <Text style={{ fontSize: compact ? 15 : 17, fontWeight: '500' }}> bpm</Text> : stepsReady && stepsTotal != null ? <Text style={{ fontSize: compact ? 13 : 15, fontWeight: '500' }}>{stepsGoal != null ? ` / ${stepsGoal.toLocaleString(locale)}` : ''} {t('home.metric.stepsUnit')}</Text> : null}</Text>
        <Text style={{ color: theme.textSecondary, fontSize: compact ? 12 : 13, marginTop: 1 }} numberOfLines={1}>{secondary}</Text>
      </View>
      {waterSummary ? <CircularProgress label={metricLabel} value={waterSummary.totalMl} maxValue={waterSummary.goalMl} size={compact ? 50 : 54} strokeWidth={6} color={accent} trackColor={soft} /> : metric.current !== undefined && metric.goal !== undefined ? <CircularProgress label={metricLabel} value={metric.current} maxValue={metric.goal} size={compact ? 50 : 54} strokeWidth={6} color={accent} trackColor={soft} /> : metric.key === 'sleep' && sleep?.state === 'ready' && sleep.goal != null && sleep.goal > 0
        ? <CircularProgress label={metricLabel} value={sleep.minutes} maxValue={sleep.goal} size={compact ? 50 : 54} strokeWidth={6} color={accent} trackColor={soft} />
        : stepsReady && stepsTotal != null && stepsGoal != null && stepsGoal > 0 ? <CircularProgress label={metricLabel} value={steps?.progressPercent ?? stepsTotal} maxValue={steps?.progressPercent == null ? stepsGoal : 100} size={compact ? 50 : 54} strokeWidth={6} color={accent} trackColor={soft} /> : null}
    </View>
    {metric.key === 'heart-rate' || metric.key === 'sleep' ? null : metric.key === 'steps' ? steps?.state === 'ready' && steps.buckets?.some((value) => value != null) ? <View style={{ height: compact ? 31 : 34, marginTop: 8 }}><MiniBarChart data={steps.buckets.map((value) => value ?? 0)} color={chartColor} height={compact ? 31 : 34} trackColor={soft} /></View> : null : waterSummary ? <View style={{ height: compact ? 31 : 34, marginTop: 8 }}><MiniBarChart data={[...waterSummary.logs].sort((a, b) => Date.parse(a.loggedAt) - Date.parse(b.loggedAt)).map((log) => log.amountMl)} color={chartColor} height={compact ? 31 : 34} trackColor={soft} maxValue={500} /></View> : null}
  </Pressable>;
}
