import { useEffect, useMemo, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, useTranslations } from '@/i18n';
import { radius, sizing, spacing } from '@/theme';
import type { HeartRateAnalyticsBucket, HeartRateAnalyticsPeriod } from '../utils/heart-rate-analytics';
import { connectedHeartRateSegments } from '../utils/heart-rate-analytics';
import { heartRateMessages } from '../messages';

const axisLeft = 42;
const axisRight = 10;
const axisTop = 12;
const plotHeight = 166;
const plotBottom = axisTop + plotHeight;
const timeZone = 'Asia/Ho_Chi_Minh';

function formatTime(instant: string, locale: string, includeDate: boolean, hourOnly = false) {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    ...(includeDate ? { day: '2-digit', month: '2-digit' } : {}),
    hour: '2-digit',
    ...(!hourOnly ? { minute: '2-digit' } : {}),
    hourCycle: 'h23',
  }).format(date);
}

function formatGroupLabel(bucket: HeartRateAnalyticsBucket, period: HeartRateAnalyticsPeriod, locale: string) {
  if (period === 'day') return formatTime(bucket.startAt, locale, false, true);
  return new Intl.DateTimeFormat(locale, { timeZone, weekday: 'short', day: '2-digit' }).format(new Date(bucket.startAt));
}

export function HeartRateRangeChart({ buckets, period }: { buckets: HeartRateAnalyticsBucket[]; period: HeartRateAnalyticsPeriod }) {
  const theme = useTheme();
  const { locale } = useI18n();
  const t = useTranslations(heartRateMessages);
  const [selectedStartAt, setSelectedStartAt] = useState<string | null>(null);
  const selected = selectedStartAt ? buckets.find((bucket) => bucket.startAt === selectedStartAt) ?? null : null;

  useEffect(() => {
    if (!selectedStartAt) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { setSelectedStartAt(null); return true; });
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedStartAt(null); };
    if (Platform.OS === 'web') globalThis.addEventListener('keydown', onKeyDown);
    return () => { subscription.remove(); if (Platform.OS === 'web') globalThis.removeEventListener('keydown', onKeyDown); };
  }, [selectedStartAt]);

  const populated = useMemo(() => buckets.filter((bucket) => bucket.sampleCount > 0 && bucket.avgBpm != null), [buckets]);
  const chartWidth = Math.max(330, axisLeft + axisRight + buckets.length * (period === 'day' ? 28 : period === 'week' ? 42 : 40));
  const plotWidth = chartWidth - axisLeft - axisRight;
  const values = populated.flatMap((bucket) => [bucket.minBpm ?? bucket.avgBpm!, bucket.maxBpm ?? bucket.avgBpm!]);
  const dataLow = values.length ? Math.min(...values) : 60;
  const dataHigh = values.length ? Math.max(...values) : 120;
  const pad = Math.max(5, (dataHigh - dataLow) * 0.14);
  const low = Math.floor((dataLow - pad) / 5) * 5;
  const high = Math.ceil((dataHigh + pad) / 5) * 5;
  const y = (value: number) => axisTop + (high - value) / Math.max(1, high - low) * plotHeight;
  const x = (index: number) => axisLeft + (buckets.length <= 1 ? plotWidth / 2 : index * plotWidth / (buckets.length - 1));
  const segments = connectedHeartRateSegments(buckets);
  const bucketIndexes = new Map(buckets.map((bucket, index) => [bucket.startAt, index]));
  const ticks = Array.from({ length: 5 }, (_, index) => high - (high - low) * index / 4);
  const tickIndexes = Array.from(new Set([0, Math.round((buckets.length - 1) / 3), Math.round((buckets.length - 1) * 2 / 3), Math.max(0, buckets.length - 1)]));
  const hitWidth = Math.max(32, Math.min(44, plotWidth / Math.max(1, buckets.length - 1)));

  return <View style={{ gap: spacing.sm }}>
    {populated.length ? <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingBottom: spacing.xs }}>
      <View style={{ width: chartWidth, height: plotBottom + 38 }}>
        <Svg width={chartWidth} height={plotBottom + 38} pointerEvents="none" accessibilityLabel={t('chartAccessible')}>
          {ticks.map((value) => <G key={value}>
            <Line x1={axisLeft} x2={chartWidth - axisRight} y1={y(value)} y2={y(value)} stroke={theme.border} strokeWidth={1} />
            <SvgText x={axisLeft - 7} y={y(value) + 4} fill={theme.textSecondary} fontSize={10} textAnchor="end">{Math.round(value)}</SvgText>
          </G>)}
          {buckets.map((bucket, index) => bucket.sampleCount > 0 && bucket.avgBpm != null ? <G key={bucket.startAt}>
            <Line x1={x(index)} x2={x(index)} y1={y(bucket.minBpm ?? bucket.avgBpm)} y2={y(bucket.maxBpm ?? bucket.avgBpm)} stroke={theme.heartRate} strokeOpacity={0.3} strokeWidth={5} strokeLinecap="round" />
            <Line x1={x(index) - 4} x2={x(index) + 4} y1={y(bucket.minBpm ?? bucket.avgBpm)} y2={y(bucket.minBpm ?? bucket.avgBpm)} stroke={theme.heartRate} strokeOpacity={0.4} strokeWidth={1.3} />
            <Line x1={x(index) - 4} x2={x(index) + 4} y1={y(bucket.maxBpm ?? bucket.avgBpm)} y2={y(bucket.maxBpm ?? bucket.avgBpm)} stroke={theme.heartRate} strokeOpacity={0.4} strokeWidth={1.3} />
          </G> : null)}
          {segments.map((segment, index) => {
            const d = segment.map((bucket, pointIndex) => `${pointIndex === 0 ? 'M' : 'L'} ${x(bucketIndexes.get(bucket.startAt) ?? 0)} ${y(bucket.avgBpm!)}`).join(' ');
            return <Path key={index} d={d} fill="none" stroke={theme.heartRate} strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" />;
          })}
          {buckets.map((bucket, index) => bucket.sampleCount > 0 && bucket.avgBpm != null ? <Circle key={bucket.startAt} cx={x(index)} cy={y(bucket.avgBpm)} r={selectedStartAt === bucket.startAt ? 5.5 : 3.5} fill={selectedStartAt === bucket.startAt ? theme.accent : theme.heartRate} stroke={theme.backgroundElement} strokeWidth={1.5} /> : null)}
          {tickIndexes.map((index) => {
            const bucket = buckets[index];
            if (!bucket) return null;
            return <SvgText key={index} x={x(index)} y={plotBottom + 22} fill={theme.textSecondary} fontSize={10} textAnchor={index === 0 ? 'start' : index === buckets.length - 1 ? 'end' : 'middle'}>{formatGroupLabel(bucket, period, locale)}</SvgText>;
          })}
        </Svg>
        <Pressable accessibilityLabel={t('dismissTooltip')} onPress={() => setSelectedStartAt(null)} style={{ position: 'absolute', zIndex: 1, left: axisLeft, top: axisTop, width: plotWidth, height: plotHeight }} />
        {buckets.map((bucket, index) => bucket.sampleCount > 0 && bucket.avgBpm != null ? <Pressable key={bucket.startAt} accessibilityRole="button" accessibilityState={{ selected: selectedStartAt === bucket.startAt }} accessibilityLabel={t('inspectBucket', { time: formatGroupLabel(bucket, period, locale), average: bucket.avgBpm.toLocaleString(locale), minimum: bucket.minBpm?.toLocaleString(locale) ?? '—', maximum: bucket.maxBpm?.toLocaleString(locale) ?? '—', count: bucket.sampleCount.toLocaleString(locale) })} onPress={() => setSelectedStartAt(bucket.startAt)} style={{ position: 'absolute', zIndex: 2, left: x(index) - hitWidth / 2, top: y(bucket.avgBpm) - 22, width: hitWidth, height: 44, alignItems: 'center', justifyContent: 'center' }} /> : null)}
      </View>
    </ScrollView> : <View style={{ minHeight: 170, alignItems: 'center', justifyContent: 'center' }}><ThemedText variant="body" themeColor="textSecondary" style={{ textAlign: 'center' }}>{t('noSeries')}</ThemedText></View>}
    {selected ? <View style={{ padding: spacing.md, gap: spacing.xs, borderRadius: radius.lg, backgroundColor: theme.backgroundSelected }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <ThemedText variant="labelStrong" style={{ flex: 1 }}>{t('bucketRange', { start: formatGroupLabel(selected, period, locale), end: period === 'day' ? formatTime(selected.endAt, locale, false, true) : formatGroupLabel({ ...selected, startAt: selected.endAt }, period, locale) })}</ThemedText>
        <Pressable accessibilityRole="button" accessibilityLabel={t('dismissTooltip')} onPress={() => setSelectedStartAt(null)} style={{ minWidth: sizing.controlMin, minHeight: sizing.controlMin, alignItems: 'center', justifyContent: 'center' }}><ThemedText variant="bodyStrong" themeColor="accent">×</ThemedText></Pressable>
      </View>
      <ThemedText variant="body">{t('bucketSummary', { average: selected.avgBpm?.toLocaleString(locale, { maximumFractionDigits: 1 }) ?? '—', minimum: selected.minBpm?.toLocaleString(locale) ?? '—', maximum: selected.maxBpm?.toLocaleString(locale) ?? '—' })}</ThemedText>
      <ThemedText variant="caption" themeColor="textSecondary">{t('bucketSamples', { count: selected.sampleCount.toLocaleString(locale) })}</ThemedText>
    </View> : null}
  </View>;
}
