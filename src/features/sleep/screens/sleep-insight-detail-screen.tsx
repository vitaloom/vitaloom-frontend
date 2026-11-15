import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, useTranslations } from '@/i18n';
import { radius, spacing } from '@/theme';
import { SleepAiSection } from '../components/sleep-ai-section';
import { SleepButton, SleepCard, SleepNotice, SleepPage } from '../components/sleep-ui';
import { sleepArt } from '../assets/sleep-art';
import { useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import { sleepMessages } from '../messages';
import type { InsightKey, SleepInsightDetail, SleepInsightStatus } from '../types/sleep';
import { readSleepDetailVisual, type SleepCalendarDay, type SleepDetailVisual } from '../utils/sleep-detail-evidence';
import { startOfWeek } from '../utils/sleep-date';
import { sleepDay, sleepDuration, sleepPeriod } from '../utils/sleep-format';
import { sleepGoalInsightCopy } from '../utils/sleep-goal-insight-copy';
import { sleepTrendInsightCopy } from '../utils/sleep-trend-insight-copy';

type Translate = (key: keyof typeof sleepMessages.en, values?: Record<string, string | number>) => string;

function displayValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return String(value);
  try { return JSON.stringify(value); } catch { return ''; }
}

function statusMessage(status: SleepInsightStatus, t: Translate) {
  if (status === 'READY') return t('insightStatusReady');
  if (status === 'INSUFFICIENT_DATA') return t('insightStatusInsufficient');
  if (status === 'NO_DATA') return t('insightStatusNoData');
  return t('insightStatusUnverified');
}

function EvidenceValue({ label, value }: { label: string; value: unknown }) {
  return <ThemedText variant="subhead" themeColor="textSecondary">{label}: {displayValue(value)}</ThemedText>;
}

const calendarStatuses = {
  RECORDED: { label: 'calendarRecorded', symbol: '✓', tone: 'success' },
  NOT_RECORDED: { label: 'notRecorded', symbol: '–', tone: 'textSecondary' },
  MET: { label: 'calendarMet', symbol: '✓', tone: 'success' },
  MISSED: { label: 'calendarMissed', symbol: '×', tone: 'warning' },
  NO_MAIN: { label: 'calendarNoMain', symbol: '–', tone: 'textSecondary' },
  NO_GOAL: { label: 'calendarNoGoal', symbol: '○', tone: 'textSecondary' },
} as const;

function DetailCalendar({ days, t, locale }: { days?: SleepCalendarDay[]; t: Translate; locale: string }) {
  const theme = useTheme();
  if (!days) return <SleepNotice title={t('insightCalendarUnavailable')} />;
  const statuses = [...new Set(days.map(({ status }) => status))];
  const format = new Intl.NumberFormat(locale);
  return <SleepCard>
    <ThemedText accessibilityRole="header" variant="bodyStrong">{t('insightCalendarTitle')}</ThemedText>
    <View style={calendarStyles.days}>
      {days.map(({ day, status }) => {
        const { label, symbol, tone } = calendarStatuses[status];
        return <View key={day} accessible accessibilityLabel={`${sleepDay(day, locale)}. ${t(label)}`}
          style={calendarStyles.day}>
          <ThemedText variant="label">{format.format(Number(day.slice(-2)))}</ThemedText>
          <View style={[calendarStyles.marker, { backgroundColor: theme.sleepSoft }]}>
            <ThemedText variant="bodyStrong" themeColor={tone}>{symbol}</ThemedText>
          </View>
        </View>;
      })}
    </View>
    <View style={calendarStyles.legend}>
      {statuses.map((status) => {
        const { label, symbol, tone } = calendarStatuses[status];
        return <ThemedText key={status} variant="caption" themeColor={tone}>{symbol} {t(label)}</ThemedText>;
      })}
    </View>
  </SleepCard>;
}

const calendarStyles = StyleSheet.create({
  days: { flexDirection: 'row', gap: spacing.xs },
  day: { flex: 1, minWidth: 0, alignItems: 'center', gap: spacing.xs },
  marker: { width: '100%', alignItems: 'center', borderRadius: radius.sm, paddingVertical: spacing.xs },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, rowGap: spacing.xs },
});

function DetailVisual({ visual, t, locale }: { visual: SleepDetailVisual; t: Translate; locale: string }) {
  const theme = useTheme();
  if (visual.code === 'A05' || visual.code === 'B02') {
    const first = visual.code === 'A05' ? visual.weekday : visual.comfortable;
    const second = visual.code === 'A05' ? visual.weekend : visual.tired;
    const firstLabel = t(visual.code === 'A05' ? 'insightWeekday' : 'insightComfortable');
    const secondLabel = t(visual.code === 'A05' ? 'insightWeekend' : 'insightTired');
    const maximum = Math.max(first.meanMinutes, second.meanMinutes);
    const number = new Intl.NumberFormat(locale);
    const delta = `${visual.deltaMinutes > 0 ? '+' : ''}${number.format(visual.deltaMinutes)}`;
    return <>
      <SleepCard tone="mint">
        <ThemedText variant="metricLarge">{delta} {t('durationMinutesUnit')}</ThemedText>
        <ThemedText variant="subhead" themeColor="textSecondary">
          {t(visual.code === 'A05' ? 'insightWeekdayDelta' : 'insightFeelingDelta')}
        </ThemedText>
      </SleepCard>
      <SleepCard>
        {[{ label: firstLabel, value: first }, { label: secondLabel, value: second }].map(({ label, value }, index) => <View key={label} style={{ gap: spacing.xs }}>
          <ThemedText variant="labelStrong">{label} · {t('insightSampleDays', { count: value.days })}</ThemedText>
          <View accessibilityRole="image" accessibilityLabel={`${label}: ${sleepDuration(value.meanMinutes)}, ${t('insightSampleDays', { count: value.days })}`}
            style={{ height: 18, borderRadius: 9, overflow: 'hidden', backgroundColor: theme.backgroundSelected }}>
            <View style={{ width: `${value.meanMinutes / maximum * 100}%`, height: '100%', borderRadius: 9,
              backgroundColor: index === 0 ? theme.sleep : theme.accent }} />
          </View>
          <ThemedText variant="labelStrong" style={{ textAlign: 'right' }}>{sleepDuration(value.meanMinutes)}</ThemedText>
        </View>)}
      </SleepCard>
    </>;
  }

  if (visual.code === 'A04') {
    const number = new Intl.NumberFormat(locale, { minimumIntegerDigits: 2 });
    const time = (minute: number) => {
      const day = Math.floor(minute / 1440);
      const dayMinute = ((minute % 1440) + 1440) % 1440;
      const label = `${number.format(Math.floor(dayMinute / 60))}:${number.format(dayMinute % 60)}`;
      return day < 0 ? `${label} (${t('insightPreviousDay')})` : day > 0 ? `${label} (${t('insightNextDay')})` : label;
    };
    return <SleepCard>
      <ThemedText accessibilityRole="header" variant="bodyStrong">{visual.timeZone}</ThemedText>
      <ThemedText variant="caption" themeColor="textSecondary">{t('insightSampleDays', { count: visual.eligibleRangeDays })}</ThemedText>
      {[
        { label: t('insightBedtimeRange'), value: visual.bedtime },
        { label: t('insightWakeRange'), value: visual.wake },
      ].map(({ label, value }) => <View key={label} style={{ gap: spacing.xs }}>
        <ThemedText variant="labelStrong">{label}</ThemedText>
        <View style={{ height: 18, borderRadius: 9, overflow: 'hidden', backgroundColor: theme.backgroundSelected }}>
          <View accessibilityRole="image" accessibilityLabel={`${label}: ${time(value.minMinute)} – ${time(value.maxMinute)}`}
            style={{ position: 'absolute', left: `${((value.minMinute + 1440) / 4320) * 100}%`,
              width: `${Math.max(2, value.spanMinutes / 4320 * 100)}%`, height: '100%', borderRadius: 9,
              backgroundColor: theme.sleep }} />
        </View>
        <ThemedText variant="caption" themeColor="textSecondary">
          {t('insightClockRange', { start: time(value.minMinute), end: time(value.maxMinute), span: value.spanMinutes })}
        </ThemedText>
      </View>)}
    </SleepCard>;
  }
  if (visual.code === 'A03') {
    const maximum = Math.max(visual.baseline.meanMinutes, visual.recent.meanMinutes);
    const delta = `${visual.deltaMinutes > 0 ? '+' : ''}${new Intl.NumberFormat(locale).format(visual.deltaMinutes)}`;
    return <>
    <SleepCard tone="mint">
      <ThemedText variant="metricLarge">{delta} {t('durationMinutesUnit')}</ThemedText>
      <ThemedText variant="subhead" themeColor="textSecondary">{t('trendDurationDelta')}</ThemedText>
    </SleepCard>
    <SleepCard>
      <ThemedText accessibilityRole="header" variant="bodyStrong">{t('trendDurationTitle')}</ThemedText>
      {[visual.baseline, visual.recent].map((window, index) => <View key={window.period.start} style={{ gap: spacing.xs }}>
        <View style={{ gap: spacing.xs }}>
          <ThemedText variant="labelStrong">{t(index === 0 ? 'trendBaseline' : 'trendRecent')}</ThemedText>
          <ThemedText variant="caption" themeColor="textSecondary">
            {sleepDay(window.period.start, locale)} – {sleepDay(window.period.end, locale)} · {t('trendMainDays', { count: window.mainDays })}
          </ThemedText>
        </View>
        <View accessibilityRole="image" accessibilityLabel={`${t(index === 0 ? 'trendBaseline' : 'trendRecent')}: ${sleepDuration(window.meanMinutes)}`}
          style={{ height: 18, borderRadius: 9, overflow: 'hidden', backgroundColor: theme.backgroundSelected }}>
          <View style={{ width: `${window.meanMinutes / maximum * 100}%`, height: '100%',
            borderRadius: 9, backgroundColor: index === 0 ? theme.sleepTrack : theme.sleep }} />
        </View>
        <ThemedText variant="labelStrong" style={{ textAlign: 'right' }}>{sleepDuration(window.meanMinutes)}</ThemedText>
      </View>)}
      <ThemedText variant="caption" themeColor="textSecondary">{t('trendCompletedWindows')}</ThemedText>
    </SleepCard></>;
  }

  if (visual.code === 'B03') {
    const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
    const heroDelta = visual.deltaPercentagePoints.comfortable;
    const signedHero = `${heroDelta > 0 ? '+' : ''}${numberFormat.format(heroDelta)}`;
    return <>
    <SleepCard tone="mint">
      <ThemedText variant="metricLarge">{signedHero}</ThemedText>
      <ThemedText variant="subhead" themeColor="textSecondary">{t('trendFeelingDelta')}</ThemedText>
    </SleepCard>
    <SleepCard>
      <ThemedText accessibilityRole="header" variant="bodyStrong">{t('trendFeelingTitle')}</ThemedText>
      {[visual.baseline, visual.recent].map((window, windowIndex) => <View key={window.period.start} style={{ gap: spacing.xs }}>
        <View style={{ gap: spacing.xs }}>
          <ThemedText variant="labelStrong">{t(windowIndex === 0 ? 'trendBaseline' : 'trendRecent')}</ThemedText>
          <ThemedText variant="caption" themeColor="textSecondary">
            {sleepDay(window.period.start, locale)} – {sleepDay(window.period.end, locale)} · {t('trendRatedDays', { count: window.ratedMain })}
          </ThemedText>
          <ThemedText variant="caption" themeColor="textSecondary">
            {t('trendMissingRatings', { count: window.mainWithoutFeeling })}
          </ThemedText>
        </View>
        <View accessibilityRole="image" accessibilityLabel={`${t(windowIndex === 0 ? 'trendBaseline' : 'trendRecent')}: ${window.categories
          .map(({ key, percentage }) => `${t(key)} ${numberFormat.format(percentage)}%`).join(', ')}`}
          style={{ flexDirection: 'row', height: 22, borderRadius: 11, overflow: 'hidden', backgroundColor: theme.sleepTrack }}>
          {window.categories.map(({ key, count, denominator }) => count > 0 ? <View key={key} style={{
            width: `${count / denominator * 100}%`, backgroundColor: key === 'comfortable'
              ? theme.sleep : key === 'normal' ? theme.accent : theme.warning,
          }} /> : null)}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, rowGap: spacing.xs }}>
          {window.categories.map(({ key, percentage }) => <ThemedText key={key} variant="caption" themeColor="textSecondary">
            {t(key)} {numberFormat.format(percentage)}%
          </ThemedText>)}
        </View>
      </View>)}
      <View style={{ gap: spacing.xs }}>
        {visual.recent.categories.map(({ key }) => {
          const change = visual.deltaPercentagePoints[key];
          const signed = `${change > 0 ? '+' : ''}${numberFormat.format(change)}`;
          return <View key={key} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm }}>
            <ThemedText variant="subhead">{t(key)}</ThemedText>
            <ThemedText variant="labelStrong">{signed} {t('trendPercentagePoints')}</ThemedText>
          </View>;
        })}
      </View>
      <ThemedText variant="caption" themeColor="textSecondary">{t('trendCompletedWindows')}</ThemedText>
    </SleepCard></>;
  }

  if (visual.code === 'A01') {
    const size = 144;
    const stroke = 12;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = circumference * visual.recordedMainDays / visual.denominator;
    return <>
      <SleepCard>
        <ThemedText accessibilityRole="header" variant="bodyStrong">{t('a01Coverage')}</ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <View accessibilityRole="image" accessibilityLabel={`${t('insightCoverageRecorded')}: ${visual.recordedMainDays} / ${visual.denominator}`}
            style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={{ position: 'absolute' }}>
              <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.sleepTrack} strokeWidth={stroke} fill="none" />
              <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.sleep} strokeWidth={stroke} fill="none"
                strokeDasharray={`${progress} ${circumference - progress}`} strokeLinecap="round" rotation={-90}
                origin={`${size / 2}, ${size / 2}`} />
            </Svg>
            <ThemedText variant="metric">{visual.recordedMainDays}/{visual.denominator}</ThemedText>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <ThemedText variant="bodyStrong">{t('insightCoverageRecorded')}</ThemedText>
            <ThemedText variant="subhead" themeColor="textSecondary">{t('insightCoverageDenominator')}</ThemedText>
          </View>
        </View>
      </SleepCard>
      <DetailCalendar days={visual.days} t={t} locale={locale} />
    </>;
  }

  if (visual.code === 'A02') return <>
    <SleepCard>
      <ThemedText accessibilityRole="header" variant="bodyStrong">{t('goalInsightA02Title')}</ThemedText>
      <ThemedText variant="metricLarge">{visual.metGoalDays}/{visual.eligibleMainDays}</ThemedText>
      <ThemedText variant="subhead" themeColor="textSecondary">{t('goalInsightMetDays')}</ThemedText>
    </SleepCard>
    <DetailCalendar days={visual.days} t={t} locale={locale} />
  </>;

  if (visual.code === 'B01') {
    const art = { comfortable: sleepArt.comfortable, normal: sleepArt.normal, tired: sleepArt.tired };
    return <SleepCard>
      <ThemedText accessibilityRole="header" variant="bodyStrong">{t('insightFeelingDistribution')}</ThemedText>
      <View accessibilityRole="image" accessibilityLabel={`${t('insightFeelingDistribution')}: ${visual.categories
        .map(({ key, count, percentage }) => `${t(key === 'comfortable' ? 'comfortable' : key === 'normal' ? 'normal' : 'tired')} ${count}, ${percentage}%`).join('; ')}`}
        style={{ flexDirection: 'row', height: 18, borderRadius: 9, overflow: 'hidden', backgroundColor: theme.sleepTrack }}>
        {visual.categories.filter(({ count }) => count > 0).map(({ key, count }) => <View key={key}
          style={{ width: `${count / visual.ratedMain * 100}%`, backgroundColor: key === 'comfortable'
            ? theme.sleep : key === 'normal' ? theme.accent : theme.warning }} />)}
      </View>
      {visual.categories.map(({ key, count, denominator, percentage }) => <View key={key}
        style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, minHeight: 42 }}>
        <Image source={art[key]} accessible={false} resizeMode="contain" style={{ width: 32, height: 32 }} />
        <ThemedText style={{ flex: 1, minWidth: 90 }} variant="subhead">{t(key === 'comfortable' ? 'comfortable' : key === 'normal' ? 'normal' : 'tired')}</ThemedText>
        <ThemedText style={{ flexShrink: 1, textAlign: 'right' }} variant="labelStrong">
          {t('insightFeelingCount', { count, rated: denominator, percent: percentage })}
        </ThemedText>
      </View>)}
      {visual.mainWithoutFeeling > 0 ? <ThemedText variant="caption" themeColor="textSecondary">
        {t('insightFeelingMissing', { count: visual.mainWithoutFeeling })}
      </ThemedText> : null}
    </SleepCard>;
  }

  return <SleepCard>
    <ThemedText accessibilityRole="header" variant="bodyStrong">{t('insightExceptionCards')}</ThemedText>
    <ThemedText variant="subhead" themeColor="textSecondary">
      {t('insightExceptionCount', { count: visual.exceptions.length, rated: visual.ratedMain })}
    </ThemedText>
    {visual.exceptions.map(({ day, minutes, goalMinutes }) => <View key={day}
      style={{ padding: 12, borderRadius: 16, backgroundColor: theme.sleepSoft, gap: 4 }}>
      <ThemedText variant="labelStrong">{sleepDay(day, locale)}</ThemedText>
      <ThemedText variant="subhead">{t('insightExceptionDuration', {
        duration: sleepDuration(minutes), goal: sleepDuration(goalMinutes),
      })}</ThemedText>
    </View>)}
  </SleepCard>;
}

function EvidenceDisclosure({ detail, visual, t, locale }: {
  detail: SleepInsightDetail; visual: SleepDetailVisual | null; t: Translate; locale: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return <>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded((value) => !value)}
      style={{ minHeight: 48, justifyContent: 'center' }}>
      <ThemedText variant="bodyStrong" themeColor="accent">
        {expanded ? t('insightHideEvidence') : t('insightExpandEvidence')}
      </ThemedText>
    </Pressable>
    {expanded ? <SleepCard>
      <ThemedText accessibilityRole="header" variant="heading">{t('insightLimitations')}</ThemedText>
      <EvidenceValue label={t('insightLimitations')} value={detail.limitations} />
      {visual ? <>
        <ThemedText accessibilityRole="header" variant="heading">{t('insightEvidence')}</ThemedText>
        {visual.code === 'A01' ? <>
          <EvidenceValue label={t('insightCoverageRecorded')} value={visual.recordedMainDays} />
          <EvidenceValue label={t('insightCoverageDenominator')} value={visual.denominator} />
        </> : null}
        {visual.code === 'A02' ? <>
          <EvidenceValue label={t('goalInsightMetDays')} value={visual.metGoalDays} />
          <EvidenceValue label={t('goalInsightEligibleDays')} value={visual.eligibleMainDays} />
        </> : null}
        {visual.code === 'A05' ? <>
          <EvidenceValue label={t('insightWeekday')} value={visual.weekday.days} />
          <EvidenceValue label={t('insightWeekend')} value={visual.weekend.days} />
          <EvidenceValue label={t('insightWeekdayDelta')} value={visual.deltaMinutes} />
        </> : null}
        {visual.code === 'B02' ? <>
          <EvidenceValue label={t('insightComfortable')} value={visual.comfortable.days} />
          <EvidenceValue label={t('insightTired')} value={visual.tired.days} />
          <EvidenceValue label={t('insightFeelingDelta')} value={visual.deltaMinutes} />
        </> : null}
        {visual.code === 'A04' ? <>
          <EvidenceValue label={t('referenceTimeZoneTitle')} value={visual.timeZone} />
          <EvidenceValue label={t('insightSampleDays', { count: visual.eligibleRangeDays })} value={visual.eligibleRangeDays} />
          <EvidenceValue label={t('insightBedtimeRange')} value={`${visual.bedtime.minMinute}–${visual.bedtime.maxMinute}`} />
          <EvidenceValue label={t('insightWakeRange')} value={`${visual.wake.minMinute}–${visual.wake.maxMinute}`} />
        </> : null}
        {visual.code === 'B01' ? <>
          <EvidenceValue label={t('goalInsightRatedDays')} value={visual.ratedMain} />
          {visual.categories.map(({ key, count, denominator, percentage }) => <EvidenceValue key={key}
            label={t(key === 'comfortable' ? 'comfortable' : key === 'normal' ? 'normal' : 'tired')}
            value={t('insightFeelingCount', { count, rated: denominator, percent: percentage })} />)}
          {visual.mainWithoutFeeling > 0 ? <ThemedText variant="subhead" themeColor="textSecondary">
            {t('insightFeelingMissing', { count: visual.mainWithoutFeeling })}
          </ThemedText> : null}
        </> : null}
        {visual.code === 'B04' ? <>
          <EvidenceValue label={t('goalInsightRatedDays')} value={visual.ratedMain} />
          <EvidenceValue label={t('goalInsightComparableDays')} value={visual.comparableRatedMain} />
          {visual.exceptions.map(({ day, minutes, goalMinutes }) => <ThemedText key={day} variant="subhead">
            {t('goalInsightException', {
              day: sleepDay(day, locale), duration: sleepDuration(minutes), goal: sleepDuration(goalMinutes),
            })}
          </ThemedText>)}
        </> : null}
      </> : null}
      <EvidenceValue label={t('insightPolicy')} value={detail.policyVersion} />
      <EvidenceValue label={t('insightEvidenceVersion')} value={detail.evidenceVersion} />
    </SleepCard> : null}
  </>;
}

function DetailContent({ detail, t, aiKey, locale, reload }: {
  detail: SleepInsightDetail; t: Translate;
  aiKey: (InsightKey & { version: string }) | null; locale: string; reload: () => void;
}) {
  const visual = readSleepDetailVisual(detail);
  const goalCopy = detail.code === 'A02' || detail.code === 'B04'
    ? sleepGoalInsightCopy(detail.code, detail.sample, detail.evidence, t) : null;
  const trendCopy = detail.code === 'A03' || detail.code === 'B03'
    ? sleepTrendInsightCopy(detail.code, detail.sample, detail.evidence, t) : null;
  if (detail.status !== 'READY') {
    return <>
      <SleepNotice title={statusMessage(detail.status, t)} />
      {detail.code === 'A04' && !aiKey ? <SleepButton variant="secondary" label={t('referenceTimeZoneTitle')}
        onPress={() => router.push('/sleep/insights')} /> : null}
    </>;
  }
  const sourceRefs = trendCopy || detail.code === 'A01' || !Array.isArray(detail.sourceRefs)
    ? [] : detail.sourceRefs.filter((ref): ref is string => typeof ref === 'string');
  const title = goalCopy?.title ?? trendCopy?.title ?? (detail.code === 'A04' ? t('insightA04Title')
    : detail.code === 'A05' ? t('insightA05Title') : detail.code === 'B02' ? t('insightB02Title') : detail.title);
  const catalogSummary = visual?.code === 'A05'
    ? t('insightA05Summary')
    : visual?.code === 'B02'
      ? t('insightB02Summary')
      : visual?.code === 'A04' ? t('insightA04Summary') : detail.summary;
  const summary = goalCopy ? goalCopy.summary : trendCopy?.summary ?? catalogSummary;
  return <>
    <SleepCard tone="mint">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Image source={detail.code === 'A03' ? sleepArt.trend
          : detail.code === 'A01' || detail.code === 'A04' ? sleepArt.moon : detail.code === 'A02' ? sleepArt.bed
          : detail.code === 'B02' ? sleepArt.comfortable
          : detail.code === 'B01' || detail.code === 'B03' || detail.code === 'A05' ? sleepArt.bars : sleepArt.tired}
          accessible={false} resizeMode="contain" style={{ width: 54, height: 54 }} />
        <View style={{ flex: 1, gap: 4 }}>
          <ThemedText variant="labelStrong" themeColor="accent">{detail.code} · {title}</ThemedText>
          {trendCopy ? null : <ThemedText variant="caption" themeColor="textSecondary">
            {sleepPeriod(detail.period.start, detail.period.end)}
          </ThemedText>}
        </View>
      </View>
      {summary ? <ThemedText variant="subhead">{summary}</ThemedText> : null}
    </SleepCard>
    {visual ? <DetailVisual visual={visual} t={t} locale={locale} />
      : <SleepNotice title={t('insightVisualUnavailable')} />}
    <EvidenceDisclosure detail={detail} visual={visual} t={t} locale={locale} />
    {aiKey && visual && (detail.code === 'A01' || detail.code === 'B01')
      ? <SleepAiSection key={JSON.stringify(detail.period) + detail.evidenceVersion}
        request={{ kind: 'explanation', insight: aiKey }}
        requestKey={'explanation:' + JSON.stringify(aiKey)} onStale={reload} /> : null}
    {sourceRefs.length > 0 ?
      <SleepButton variant="secondary" label={`${t('insightSources')} (${sourceRefs.length})`}
        onPress={() => router.push({ pathname: '/sleep/journal', params: {
          sourceIds: sourceRefs.join(','), sourceVersion: detail.evidenceVersion,
        } })} /> : null}
  </>;
}

export default function SleepInsightDetailScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const repository = useSleepRepository();
  const t = useTranslations(sleepMessages);
  const { locale } = useI18n();
  const insightCode = code === 'A01' || code === 'A02' || code === 'A03' || code === 'A04' || code === 'A05'
    || code === 'B01' || code === 'B02' || code === 'B03' || code === 'B04' ? code : null;
  const { state, reload } = useSleepRead(
    () => insightCode ? repository.getInsightDetail(insightCode) : Promise.resolve({ kind: 'error' as const, message: 'Unsupported insight.' }),
    `sleep-insight-detail:${insightCode ?? 'unsupported'}`,
    false, true,
  );
  const detail = state.kind === 'ready' ? state.data : null;
  const detailVisual = detail ? readSleepDetailVisual(detail) : null;
  const aiKey = detail && detailVisual && (detail.code === 'A01' || detail.code === 'B01') ? {
    code: detail.code, week: startOfWeek(repository.getContext().today), version: detail.evidenceVersion,
  } : null;

  return <SleepPage title={t('insightDetail')} fallback="/sleep/insights">
    {state.kind === 'loading' ? <SleepNotice title={t('loadingInsight')} loading /> : null}
    {state.kind === 'error' ? <SleepNotice title={t('insightUnavailable')} message={state.message} error
      actionLabel={t('insightRetry')} onAction={reload} /> : null}
    {state.kind === 'ready' ? <DetailContent detail={state.data} t={t} locale={locale} aiKey={aiKey} reload={reload} /> : null}
  </SleepPage>;
}
