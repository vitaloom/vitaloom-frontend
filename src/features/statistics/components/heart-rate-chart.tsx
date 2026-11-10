import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { spacing } from '@/theme';
import type { HeartRateBucket, HeartRateSeries } from '@/features/heart-rate/api/heart-rate-api';

const left = 38;
const right = 12;
const top = 12;
const plotHeight = 142;
const plotBottom = top + plotHeight;

function timeLabel(instant: string, intervalMinutes: number, timezone: string, includeDate: boolean) {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, ...(includeDate ? { day: '2-digit', month: '2-digit' } : {}), hour: '2-digit', ...(intervalMinutes >= 60 ? {} : { minute: '2-digit' }), hourCycle: 'h23' }).format(date);
}

export function HeartRateChart({ series }: { series: HeartRateSeries }) {
  const theme = useTheme();
  const [selected, setSelected] = useState<HeartRateBucket | null>(null);
  const values = useMemo(() => series.buckets.flatMap((bucket) => bucket.avgBpm == null ? [] : [bucket.avgBpm]), [series.buckets]);
  const chartWidth = Math.max(520, series.buckets.length * 7);
  const plotWidth = chartWidth - left - right;
  const low = values.length ? Math.floor(Math.min(...values) / 10) * 10 - 10 : 40;
  const high = values.length ? Math.ceil(Math.max(...values) / 10) * 10 + 10 : 160;
  const includeDate = Date.parse(series.endAt) - Date.parse(series.startAt) > 86400000;
  const y = (value: number) => top + (high - value) / Math.max(1, high - low) * plotHeight;
  const x = (index: number) => left + index * plotWidth / Math.max(1, series.buckets.length - 1);
  const segments: string[] = [];
  let current: string[] = [];
  series.buckets.forEach((bucket, index) => {
    if (bucket.avgBpm == null) {
      if (current.length) segments.push(current.join(' '));
      current = [];
    } else current.push(`${current.length ? 'L' : 'M'} ${x(index)} ${y(bucket.avgBpm)}`);
  });
  if (current.length) segments.push(current.join(' '));
  const tickIndexes = [0, Math.floor(series.buckets.length / 3), Math.floor(series.buckets.length * 2 / 3), Math.max(0, series.buckets.length - 1)];

  return <View style={{ gap: spacing.sm }}>
    {values.length ? <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingBottom: spacing.xs }}>
      <Svg width={chartWidth} height={plotBottom + 34} accessibilityLabel="Heart rate average by time bucket">
        {[low, (low + high) / 2, high].map((value) => <Line key={value} x1={left} x2={chartWidth - right} y1={y(value)} y2={y(value)} stroke={theme.border} strokeWidth={1} />)}
        {[low, high].map((value) => <SvgText key={value} x={left - 6} y={y(value) + 4} fill={theme.textSecondary} fontSize={10} textAnchor="end">{value}</SvgText>)}
        {segments.map((segment, index) => <Path key={index} d={segment} fill="none" stroke={theme.heartRate} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />)}
        {series.buckets.map((bucket, index) => bucket.avgBpm == null ? null : <Circle key={bucket.startAt} cx={x(index)} cy={y(bucket.avgBpm)} r={selected?.startAt === bucket.startAt ? 6 : 3.5} fill={selected?.startAt === bucket.startAt ? theme.accent : theme.heartRate} stroke={theme.backgroundElement} strokeWidth={1.5} onPress={() => setSelected(bucket)} accessibilityLabel={`${timeLabel(bucket.startAt, series.intervalMinutes, series.timezone, includeDate)}, average ${bucket.avgBpm} bpm. Inspect bucket`} />)}
        {tickIndexes.map((index) => {
          const bucket = series.buckets[index];
          return bucket ? <SvgText key={index} x={x(index)} y={plotBottom + 20} fill={theme.textSecondary} fontSize={10} textAnchor={index === 0 ? 'start' : index === series.buckets.length - 1 ? 'end' : 'middle'}>{timeLabel(bucket.startAt, series.intervalMinutes, series.timezone, includeDate)}</SvgText> : null;
        })}
      </Svg>
    </ScrollView> : <View style={{ minHeight: 180, justifyContent: 'center', alignItems: 'center' }}><ThemedText variant="body" themeColor="textSecondary" style={{ textAlign: 'center' }}>No heart rate samples in this range.</ThemedText></View>}
    {selected ? <View style={{ padding: spacing.md, gap: spacing.xs, borderRadius: 12, backgroundColor: theme.backgroundSelected }}>
      <ThemedText variant="labelStrong">{includeDate ? `${timeLabel(selected.startAt, series.intervalMinutes, series.timezone, true)}–${timeLabel(new Date(Date.parse(selected.startAt) + series.intervalMinutes * 60000).toISOString(), series.intervalMinutes, series.timezone, true)}` : `${timeLabel(selected.startAt, series.intervalMinutes, series.timezone, false)}–${timeLabel(new Date(Date.parse(selected.startAt) + series.intervalMinutes * 60000).toISOString(), series.intervalMinutes, series.timezone, false)}`}</ThemedText>
      <ThemedText variant="body">Average {selected.avgBpm ?? '—'} bpm · Min {selected.minBpm ?? '—'} · Max {selected.maxBpm ?? '—'}</ThemedText>
      <ThemedText variant="caption" themeColor="textSecondary">{selected.sampleCount} samples</ThemedText>
      <Pressable accessibilityRole="button" accessibilityLabel="Clear inspected bucket" onPress={() => setSelected(null)} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}><ThemedText variant="labelStrong" themeColor="accent">Clear</ThemedText></Pressable>
    </View> : values.length ? <ThemedText variant="caption" themeColor="textSecondary">Select a plotted point to inspect its bucket.</ThemedText> : null}
  </View>;
}
