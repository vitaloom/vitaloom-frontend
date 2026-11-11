import { useEffect, useMemo, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, useTranslations } from '@/i18n';
import { radius, spacing } from '@/theme';
import type { HeartRateAnalyticsBucket, HeartRateAnalyticsPeriod } from '../utils/heart-rate-analytics';
import { connectedHeartRateSegments } from '../utils/heart-rate-analytics';
import { heartRateMessages } from '../messages';

const axisLeft = 42;
const axisRight = 10;
const axisTop = 14;
const plotHeight = 154;
const plotBottom = axisTop + plotHeight;
const plotAreaHeight = 236;
const timeZone = 'Asia/Ho_Chi_Minh';

function formatTime(instant: string, locale: string, hourOnly = false) {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { timeZone, hour: '2-digit', ...(!hourOnly ? { minute: '2-digit' } : {}), hourCycle: 'h23' }).format(date);
}

function formatGroupLabel(bucket: HeartRateAnalyticsBucket, period: HeartRateAnalyticsPeriod, locale: string) {
  if (period === 'day') return formatTime(bucket.startAt, locale, true);
  return new Intl.DateTimeFormat(locale, { timeZone, weekday: 'short', day: '2-digit' }).format(new Date(bucket.startAt));
}

export function HeartRateRangeChart({ buckets, period }: { buckets: HeartRateAnalyticsBucket[]; period: HeartRateAnalyticsPeriod }) {
  const theme = useTheme();
  const { locale } = useI18n();
  const t = useTranslations(heartRateMessages);
  const [selectedStartAt, setSelectedStartAt] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState(360);
  const selectedIndex = selectedStartAt ? buckets.findIndex((bucket) => bucket.startAt === selectedStartAt && bucket.sampleCount > 0 && bucket.avgBpm != null) : -1;
  const selected = selectedIndex >= 0 ? buckets[selectedIndex] : null;

  useEffect(() => {
    if (!selected) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { setSelectedStartAt(null); return true; });
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedStartAt(null); };
    if (Platform.OS === 'web') globalThis.addEventListener('keydown', onKeyDown);
    return () => { subscription.remove(); if (Platform.OS === 'web') globalThis.removeEventListener('keydown', onKeyDown); };
  }, [selected]);

  const populated = useMemo(() => buckets.filter((bucket) => bucket.sampleCount > 0 && bucket.avgBpm != null), [buckets]);
  const chartWidth = period === 'day' ? viewportWidth : Math.max(viewportWidth, axisLeft + axisRight + buckets.length * 42);
  const plotWidth = Math.max(1, chartWidth - axisLeft - axisRight);
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
  const tickIndexes = period === 'day' ? [0, 24, 48, 72, 95] : Array.from(new Set([0, Math.round((buckets.length - 1) / 3), Math.round((buckets.length - 1) * 2 / 3), Math.max(0, buckets.length - 1)]));
  const tooltipWidth = Math.min(220, Math.max(180, chartWidth - axisLeft - axisRight - 8));
  const tooltipLeft = selected ? Math.max(axisLeft + 2, Math.min(chartWidth - axisRight - tooltipWidth - 2, x(selectedIndex) - tooltipWidth / 2)) : 0;
  const tooltipTop = selected ? Math.max(axisTop, Math.min(plotBottom - 98, y(selected.avgBpm!) - 106)) : 0;

  const chart = <View style={{ width: chartWidth, height: plotAreaHeight, position: 'relative' }}>
    <Svg width={chartWidth} height={plotAreaHeight} pointerEvents="none" accessibilityLabel={t('chartAccessible')}>
      {ticks.map((value) => <G key={value}>
        <Line x1={axisLeft} x2={chartWidth - axisRight} y1={y(value)} y2={y(value)} stroke={theme.border} strokeWidth={1} />
        <SvgText x={axisLeft - 7} y={y(value) + 4} fill={theme.textSecondary} fontSize={10} textAnchor="end">{Math.round(value)}</SvgText>
      </G>)}
      {buckets.map((bucket, index) => bucket.sampleCount > 0 && bucket.avgBpm != null ? <G key={bucket.startAt}>
        <Line x1={x(index)} x2={x(index)} y1={y(bucket.minBpm ?? bucket.avgBpm)} y2={y(bucket.maxBpm ?? bucket.avgBpm)} stroke={theme.heartRate} strokeOpacity={0.3} strokeWidth={period === 'day' ? 2 : 5} strokeLinecap="round" />
        {period !== 'day' ? <>
          <Line x1={x(index) - 4} x2={x(index) + 4} y1={y(bucket.minBpm ?? bucket.avgBpm)} y2={y(bucket.minBpm ?? bucket.avgBpm)} stroke={theme.heartRate} strokeOpacity={0.4} strokeWidth={1.3} />
          <Line x1={x(index) - 4} x2={x(index) + 4} y1={y(bucket.maxBpm ?? bucket.avgBpm)} y2={y(bucket.maxBpm ?? bucket.avgBpm)} stroke={theme.heartRate} strokeOpacity={0.4} strokeWidth={1.3} />
        </> : null}
      </G> : null)}
      {segments.map((segment, index) => {
        const d = segment.map((bucket, pointIndex) => `${pointIndex === 0 ? 'M' : 'L'} ${x(bucketIndexes.get(bucket.startAt) ?? 0)} ${y(bucket.avgBpm!)}`).join(' ');
        return <Path key={index} d={d} fill="none" stroke={theme.heartRate} strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" />;
      })}
      {buckets.map((bucket, index) => bucket.sampleCount > 0 && bucket.avgBpm != null ? <Circle key={bucket.startAt} cx={x(index)} cy={y(bucket.avgBpm)} r={selectedStartAt === bucket.startAt ? 5.5 : period === 'day' ? 2.3 : 3.5} fill={selectedStartAt === bucket.startAt ? theme.accent : theme.heartRate} stroke={theme.backgroundElement} strokeWidth={1.5} /> : null)}
      {tickIndexes.map((index) => {
        const bucket = buckets[index];
        if (!bucket) return null;
        const label = period === 'day' && index === 95 ? '24' : formatGroupLabel(bucket, period, locale);
        return <SvgText key={index} x={x(index)} y={plotBottom + 22} fill={theme.textSecondary} fontSize={10} textAnchor={index === 0 ? 'start' : index === buckets.length - 1 ? 'end' : 'middle'}>{label}</SvgText>;
      })}
    </Svg>
    <Pressable accessibilityLabel={t('dismissTooltip')} onPress={(event) => {
      if (!populated.length) return setSelectedStartAt(null);
      const plotX = Math.max(0, Math.min(plotWidth, event.nativeEvent.locationX));
      const targetIndex = Math.round(plotX / plotWidth * (buckets.length - 1));
      let nearestIndex = -1;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (let index = 0; index < buckets.length; index += 1) {
        const bucket = buckets[index];
        if (bucket.sampleCount === 0 || bucket.avgBpm == null) continue;
        const distance = Math.abs(index - targetIndex);
        if (distance < nearestDistance) { nearestIndex = index; nearestDistance = distance; }
      }
      setSelectedStartAt(nearestIndex >= 0 ? buckets[nearestIndex].startAt : null);
    }} style={{ position: 'absolute', zIndex: 1, left: axisLeft, top: axisTop, width: plotWidth, height: plotHeight }} />
    {selected ? <View style={{ position: 'absolute', zIndex: 2, left: tooltipLeft, top: tooltipTop, width: tooltipWidth, padding: spacing.sm, gap: spacing.xs, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.backgroundElement, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 8, elevation: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs }}>
        <ThemedText variant="caption" style={{ flex: 1 }}>{t('bucketRange', { start: formatTime(selected.startAt, locale), end: formatTime(selected.endAt, locale) })}</ThemedText>
        <Pressable accessibilityRole="button" accessibilityLabel={t('dismissTooltip')} onPress={() => setSelectedStartAt(null)}><ThemedText variant="bodyStrong" themeColor="accent">×</ThemedText></Pressable>
      </View>
      <ThemedText variant="caption">{t('bucketSummary', { average: selected.avgBpm?.toLocaleString(locale, { maximumFractionDigits: 1 }) ?? '—', minimum: selected.minBpm?.toLocaleString(locale) ?? '—', maximum: selected.maxBpm?.toLocaleString(locale) ?? '—' })}</ThemedText>
      <ThemedText variant="caption" themeColor="textSecondary">{t('bucketSamples', { count: selected.sampleCount.toLocaleString(locale) })}</ThemedText>
    </View> : null}
  </View>;

  return <View style={{ width: '100%' }} onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}>
    {period === 'day' ? chart : <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingBottom: spacing.xs }}>{chart}</ScrollView>}
  </View>;
}
