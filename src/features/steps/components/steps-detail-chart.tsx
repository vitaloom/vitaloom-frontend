import { useEffect, useMemo, useState } from 'react';
import { BackHandler, Platform, Pressable, View } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, useTranslations } from '@/i18n';
import { radius, spacing } from '@/theme';
import type { StepsBucket, StepsSeries } from '../api/steps-api';
import { stepsMessages } from '../messages';

type StepsPeriod = 'day' | 'week';
const left = 42;
const right = 8;
const top = 22;
const baseline = 190;
const height = 232;

function formatBucket(instant: string, timezone: string, period: StepsPeriod, locale: string) {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    ...(period === 'week' ? { weekday: 'short', day: 'numeric' } : {}),
    ...(period === 'day' ? { hour: '2-digit', hourCycle: 'h23' as const } : {}),
  }).format(date);
}

export function StepsDetailChart({ series, period }: { series: StepsSeries; period: StepsPeriod }) {
  const theme = useTheme();
  const { locale } = useI18n();
  const t = useTranslations(stepsMessages);
  const [chartWidth, setChartWidth] = useState(360);
  const [selectedStartAt, setSelectedStartAt] = useState<string | null>(null);
  const selectedIndex = selectedStartAt ? series.buckets.findIndex((bucket) => bucket.startAt === selectedStartAt && bucket.steps != null && bucket.eventCount > 0) : -1;
  const selected = selectedIndex >= 0 ? series.buckets[selectedIndex] : null;
  const populated = useMemo(() => series.buckets.filter((bucket) => bucket.steps != null && bucket.eventCount > 0), [series.buckets]);
  const maxValue = Math.max(0, ...populated.map((bucket) => bucket.steps!));
  const magnitude = maxValue > 0 ? 10 ** Math.floor(Math.log10(maxValue)) : 1;
  const tickStep = Math.max(1, Math.ceil(maxValue / (4 * magnitude))) * magnitude;
  const topValue = Math.max(tickStep * 4, tickStep);
  const plotHeight = baseline - top;
  const plotWidth = Math.max(1, chartWidth - left - right);
  const cell = plotWidth / Math.max(1, series.buckets.length);
  const barWidth = Math.min(9, Math.max(4, cell * 0.58));
  const x = (index: number) => left + index * cell + cell / 2;
  const barTop = (bucket: StepsBucket) => baseline - Math.max(3, (bucket.steps! / topValue) * plotHeight);
  const selectedX = selected ? x(selectedIndex) : 0;
  const selectedY = selected ? barTop(selected) : 0;
  const tooltipWidth = Math.min(220, Math.max(180, chartWidth - left - right - 8));
  const tooltipLeft = selected ? Math.max(left + 2, Math.min(chartWidth - right - tooltipWidth - 2, selectedX - tooltipWidth / 2)) : 0;
  const tooltipTop = selected ? Math.max(top, Math.min(baseline - 94, selectedY - 104)) : 0;
  const labels = period === 'day' ? [0, 6, 12, 18, 23] : series.buckets.map((_, index) => index);
  const ticks = Array.from({ length: 5 }, (_, index) => topValue - tickStep * index);

  useEffect(() => {
    if (!selected) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => { setSelectedStartAt(null); return true; });
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedStartAt(null); };
    if (Platform.OS === 'web') globalThis.addEventListener('keydown', onKeyDown);
    return () => { back.remove(); if (Platform.OS === 'web') globalThis.removeEventListener('keydown', onKeyDown); };
  }, [selected]);

  return <View style={{ width: '100%' }} onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}>
    {series.totalSteps == null ? <View style={{ minHeight: height, alignItems: 'center', justifyContent: 'center', padding: spacing.md }}><ThemedText variant="body" themeColor="textSecondary" style={{ textAlign: 'center' }}>{t('noStepsRange')}</ThemedText></View> : <View style={{ width: chartWidth, height, position: 'relative' }}>
      <Svg width={chartWidth} height={height} pointerEvents="none" accessibilityLabel={t('stepsByTime')}>
        {ticks.map((value, index) => {
          const y = top + (topValue - value) / topValue * plotHeight;
          return <G key={index}>
            <Line x1={left} x2={chartWidth - right} y1={y} y2={y} stroke={theme.border} strokeWidth={1} />
            <SvgText x={left - 7} y={y + 4} fill={theme.textSecondary} fontSize={10} textAnchor="end">{Math.round(value).toLocaleString(locale)}</SvgText>
          </G>;
        })}
        <Line x1={left} x2={chartWidth - right} y1={baseline} y2={baseline} stroke={theme.border} strokeWidth={1} />
        {series.buckets.map((bucket, index) => bucket.steps != null && bucket.eventCount > 0 ? <Rect key={bucket.startAt} x={x(index) - barWidth / 2} y={barTop(bucket)} width={barWidth} height={baseline - barTop(bucket)} rx={barWidth / 2} fill={selectedStartAt === bucket.startAt ? theme.accent : theme.steps} /> : null)}
        {labels.map((index) => {
          const bucket = series.buckets[index];
          if (!bucket) return null;
          const label = period === 'day' && index === 23 ? '24' : formatBucket(bucket.startAt, series.timezone, period, locale);
          return <SvgText key={index} x={x(index)} y={baseline + 20} fill={theme.textSecondary} fontSize={10} textAnchor={index === 0 ? 'start' : index === series.buckets.length - 1 ? 'end' : 'middle'}>{label}</SvgText>;
        })}
      </Svg>
      <Pressable accessibilityRole="button" accessibilityLabel={t('stepsByTime')} onPress={(event) => {
        const index = Math.max(0, Math.min(series.buckets.length - 1, Math.floor(event.nativeEvent.locationX / cell)));
        const bucket = series.buckets[index];
        if (!bucket || bucket.steps == null || bucket.eventCount === 0) { setSelectedStartAt(null); return; }
        setSelectedStartAt((current) => current === bucket.startAt ? null : bucket.startAt);
      }} style={{ position: 'absolute', zIndex: 1, left, top, width: plotWidth, height: plotHeight }} />
      {selected ? <View style={{ position: 'absolute', zIndex: 2, left: tooltipLeft, top: tooltipTop, width: tooltipWidth, padding: spacing.sm, gap: spacing.xs, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.backgroundElement, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 8, elevation: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs }}>
          <ThemedText variant="caption" style={{ flex: 1 }}>{t('rangeLabel', { start: formatBucket(selected.startAt, series.timezone, period, locale), end: formatBucket(selected.endAt, series.timezone, period, locale) })}</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel={t('clearInspected')} onPress={() => setSelectedStartAt(null)}><ThemedText variant="bodyStrong" themeColor="accent">×</ThemedText></Pressable>
        </View>
        <ThemedText variant="labelStrong">{selected.steps?.toLocaleString(locale)} {t('stepsUnit')}</ThemedText>
        <ThemedText variant="caption" themeColor="textSecondary">{t('acceptedRecords', { count: selected.eventCount.toLocaleString(locale) })}</ThemedText>
      </View> : null}
    </View>}
  </View>;
}
