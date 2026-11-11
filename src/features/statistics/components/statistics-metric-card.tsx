import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Image, Pressable, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useI18n, useTranslations } from '@/i18n';
import { radius, sizing, spacing } from '@/theme';
import type { StatisticsVisuals } from '../constants/statistics-visuals';
import { statisticsMessages } from '../messages';
import type { MetricState, StatisticsMode } from '../types/statistics';
import { StatisticsTrend } from './statistics-trend';

const illustrations: Record<Metric, ImageSourcePropType> = {
  heartRate: require('../assets/heart.png'),
  steps: require('../assets/shoe.png'),
  water: require('../assets/blue_bottle.png'),
  sleep: require('../assets/sleeping_star_pillow.png'),
};
const glows = {
  heartRate: require('../assets/pink_smooth.png'),
  steps: require('../assets/green_smooth.png'),
};
const reactions = {
  comfortable: require('../../sleep/assets/feeling-comfortable.png'),
  normal: require('../../sleep/assets/feeling-normal.png'),
  tired: require('../../sleep/assets/feeling-tired.png'),
};
type Metric = 'heartRate' | 'steps' | 'water' | 'sleep';
type Props = {
  metric: Metric;
  mode: StatisticsMode;
  state: MetricState;
  previous: MetricState | null;
  visuals: StatisticsVisuals;
  onOpen: () => void;
  onRetry: () => void;
};

export function StatisticsMetricCard({ metric, mode, state, previous, visuals, onOpen, onRetry }: Props) {
  const { locale } = useI18n();
  const t = useTranslations(statisticsMessages);
  const [top, bottom, accent] = visuals[metric];
  const data = 'data' in state ? state.data : previous && 'data' in previous ? previous.data : null;
  const daySleep = metric === 'sleep' && mode === 'day';
  const description = {
    heartRate: mode === 'day' ? 'heartDay' : 'heartWeek',
    steps: 'stepTotal',
    water: mode === 'day' ? 'waterDay' : 'waterWeek',
    sleep: daySleep ? 'sleepDay' : 'sleepWeek',
  } as const;
  const value = data?.value;
  const number = (amount: number) => amount.toLocaleString(locale, { maximumFractionDigits: metric === 'water' ? 2 : 0 });
  const duration = Math.round(value ?? 0);
  const units = { heartRate: 'bpm', steps: 'stepsUnit', water: 'liters', sleep: 'minutes' } as const;
  const headline = value == null ? null : metric === 'sleep' && duration >= 60
    ? `${number(Math.floor(duration / 60))} ${t('hours')} ${number(duration % 60)}`
    : number(metric === 'water' ? value / 1000 : metric === 'sleep' ? duration : value);
  const fullValue = headline ? `${headline} ${t(units[metric])}` : null;
  const statusText = state.status === 'ready' ? null : t(state.status);
  const feeling = daySleep && state.status !== 'error' && state.status !== 'loading' ? data?.feeling : null;
  const feelingText = feeling ? t(feeling) : daySleep && state.status !== 'error' && state.status !== 'loading' ? t('noFeeling') : null;
  const preview = !daySleep && data?.trend.some((point) => point != null);
  const summary = [t(description[metric]), fullValue, statusText, feelingText].filter(Boolean).join('. ');
  const glow = metric === 'steps' || metric === 'heartRate' ? glows[metric] : null;

  return (
    <LinearGradient colors={[top, bottom]} style={styles.card}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('openMetric', { metric: t(metric), summary })}
        accessibilityState={{ busy: state.status === 'loading' }} onPress={onOpen}
        style={({ pressed }) => [styles.body, { opacity: pressed ? 0.72 : 1 }]}>
        <View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {glow ? <Image source={glow} resizeMode="contain" style={styles.glow} /> : null}
          <Image source={illustrations[metric]} resizeMode="contain" style={styles.image} />
        </View>
        <View style={styles.content}>
          <ThemedText variant="heading" style={{ color: visuals.text }}>{t(metric)}</ThemedText>
          <ThemedText variant="caption" style={{ color: visuals.secondary }}>{t(description[metric])}</ThemedText>
          {headline ? <ThemedText variant="title" style={{ color: visuals.text, fontVariant: ['tabular-nums'] }}>
            {headline} <ThemedText variant="labelStrong" style={{ color: visuals.text }}>{t(units[metric])}</ThemedText>
          </ThemedText> : null}
          {statusText ? (
            <View style={styles.status}>
              {state.status === 'loading' ? <ActivityIndicator color={accent} size="small" /> : null}
              <ThemedText variant="caption" style={{ color: visuals.secondary, flexShrink: 1 }}>{statusText}</ThemedText>
            </View>
          ) : null}
        </View>
        {preview && data ? <View style={styles.preview}><StatisticsTrend data={data.trend} color={accent} line={metric === 'heartRate'} /></View> : null}
        {feelingText ? (
          <View style={styles.reaction} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {feeling && <Image source={reactions[feeling]} resizeMode="contain" style={styles.reactionArt} />}
            <ThemedText variant="caption" style={{ color: visuals.secondary, textAlign: 'center' }}>{feelingText}</ThemedText>
          </View>
        ) : null}
        <View style={[styles.chevron, { borderColor: visuals.text }]} />
      </Pressable>
      {state.status === 'error' ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('retryMetric', { metric: t(metric) })}
          onPress={onRetry} style={({ pressed }) => [styles.retry, { opacity: pressed ? 0.7 : 1 }]}>
          <ThemedText variant="labelStrong" style={{ color: accent }}>{t('retry')}</ThemedText>
        </Pressable>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderCurve: 'continuous' },
  body: { flexDirection: 'row', alignItems: 'center', minHeight: 105, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, gap: spacing.sm },
  art: { width: '21%', maxWidth: 96, height: 78, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  glow: { position: 'absolute', width: '115%', height: '88%', bottom: -spacing.xs, opacity: 0.55 },
  content: { flex: 1, minWidth: 0 },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  preview: { width: '28%', alignSelf: 'flex-end', paddingBottom: spacing.sm },
  reaction: { width: '28%', alignItems: 'center' },
  reactionArt: { width: '100%', height: 53, marginBottom: spacing.xs },
  chevron: { width: 8, height: 8, borderTopWidth: 2, borderRightWidth: 2, transform: [{ rotate: '45deg' }], marginRight: spacing.xs },
  retry: { minHeight: sizing.controlMin, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: spacing.md, marginHorizontal: spacing.sm },
});
