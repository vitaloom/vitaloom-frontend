import { Fragment, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, useTranslations } from '@/i18n';
import { radius, spacing } from '@/theme';
import { stepsMessages } from '../messages';
import type { StepsBucket, StepsSeries } from '../api/steps-api';

function bucketLabel(instant: string, timezone: string, includeDate: boolean, locale: string) {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { timeZone: timezone, ...(includeDate ? { day: '2-digit', month: 'short' } : {}), hour: '2-digit', hourCycle: 'h23' }).format(date);
}

export function StepsChart({ series }: { series: StepsSeries }) {
  const theme = useTheme();
  const { locale } = useI18n();
  const t = useTranslations(stepsMessages);
  const [selected, setSelected] = useState<StepsBucket | null>(null);
  const values = useMemo(() => series.buckets.flatMap((bucket) => bucket.steps == null ? [] : [bucket.steps]), [series.buckets]);
  const highest = Math.max(1, ...values);
  const width = Math.max(520, series.buckets.length * 26);
  const barWidth = Math.min(14, Math.max(6, width / Math.max(1, series.buckets.length) * 0.48));
  const chartHeight = 154;
  const includeDate = series.bucketSizeMinutes >= 1440;
  const empty = values.length === 0;

  return <View style={{ gap: spacing.sm }}>
    {empty ? <View style={{ minHeight: 154, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.md }}><ThemedText variant="body" themeColor="textSecondary" style={{ textAlign: 'center' }}>{t('noStepsRange')}</ThemedText></View> : <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingBottom: spacing.xs }}>
      <Svg width={width} height={chartHeight} accessibilityLabel={t('stepsByTime')}>
        <Line x1={0} x2={width} y1={chartHeight - 26} y2={chartHeight - 26} stroke={theme.border} strokeWidth={1} />
        {series.buckets.map((bucket, index) => {
          const cell = width / series.buckets.length;
          const x = cell * index + (cell - barWidth) / 2;
          const barHeight = bucket.steps == null ? 0 : Math.max(3, (bucket.steps / highest) * 94);
          return <Fragment key={bucket.startAt}>
            {bucket.steps != null ? <Rect x={x} y={chartHeight - 27 - barHeight} width={barWidth} height={barHeight} rx={barWidth / 2} fill={selected?.startAt === bucket.startAt ? theme.accent : theme.steps} onPress={() => setSelected(bucket)} accessibilityLabel={t('inspectBucket', { time: bucketLabel(bucket.startAt, series.timezone, includeDate, locale), count: bucket.steps.toLocaleString(locale) })} /> : <Line x1={x + barWidth / 2} x2={x + barWidth / 2} y1={chartHeight - 30} y2={chartHeight - 24} stroke={theme.border} strokeWidth={1} />}
            {(index === 0 || index === series.buckets.length - 1 || index % Math.max(1, Math.floor(series.buckets.length / 5)) === 0) ? <SvgText x={cell * index + cell / 2} y={chartHeight - 7} fill={theme.textSecondary} fontSize={10} textAnchor="middle">{bucketLabel(bucket.startAt, series.timezone, includeDate, locale)}</SvgText> : null}
          </Fragment>;
        })}
      </Svg>
    </ScrollView>}
    {selected ? <View style={{ padding: spacing.md, gap: spacing.xs, borderRadius: radius.md, backgroundColor: theme.backgroundSelected }}>
      <ThemedText variant="labelStrong">{t('rangeLabel', { start: bucketLabel(selected.startAt, series.timezone, includeDate, locale), end: bucketLabel(selected.endAt, series.timezone, includeDate, locale) })}</ThemedText>
      <ThemedText variant="body">{selected.steps == null ? t('noRecordedSteps') : `${selected.steps.toLocaleString(locale)} ${t('steps').toLowerCase()}`}</ThemedText>
      <ThemedText variant="caption" themeColor="textSecondary">{t('increments', { count: selected.eventCount.toLocaleString(locale) })}</ThemedText>
      <Pressable accessibilityRole="button" accessibilityLabel={t('clearInspected')} onPress={() => setSelected(null)} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}><ThemedText variant="labelStrong" themeColor="accent">{t('clear')}</ThemedText></Pressable>
    </View> : !empty ? <ThemedText variant="caption" themeColor="textSecondary">{t('emptyBuckets')}</ThemedText> : null}
  </View>;
}
