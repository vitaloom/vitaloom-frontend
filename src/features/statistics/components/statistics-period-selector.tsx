import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useI18n, useTranslations } from '@/i18n';
import { radius, sizing, spacing } from '@/theme';
import type { StatisticsVisuals } from '../constants/statistics-visuals';
import { movePeriod } from '../data/statistics-period';
import { statisticsMessages } from '../messages';
import type { StatisticsMode, StatisticsPeriod } from '../types/statistics';

type Props = {
  period: StatisticsPeriod;
  visuals: StatisticsVisuals;
  onMode: (mode: StatisticsMode) => void;
  onMove: (date: string) => void;
};

export function StatisticsPeriodSelector({ period, visuals, onMode, onMove }: Props) {
  const { locale } = useI18n();
  const t = useTranslations(statisticsMessages);
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' });
  const start = new Date(`${period.start}T12:00:00Z`);
  const end = new Date(`${period.end}T12:00:00Z`);
  const label = period.mode === 'day' ? formatter.format(start)
    : formatter.formatRange?.(start, end) ?? `${formatter.format(start)} – ${formatter.format(end)}`;

  return (
    <View style={styles.container}>
      <View style={[styles.segments, { backgroundColor: visuals.selector }]}>
        {(['day', 'week'] as const).map((mode) => {
          const selected = mode === period.mode;
          return (
            <Pressable key={mode} accessibilityRole="tab" accessibilityState={{ selected }}
              onPress={() => onMode(mode)} style={({ pressed }) => [styles.segment, { opacity: pressed ? 0.75 : 1 }]}>
              {selected && <LinearGradient colors={ visuals.mint}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />}
              <ThemedText variant="labelStrong" style={{ color: selected ? visuals.onSelection : visuals.text }}>{t(mode)}</ThemedText>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.dateRow}>
        <PeriodArrow direction={-1} {...{ period, visuals, onMove }} />
        <ThemedText accessibilityLiveRegion="polite" variant="labelStrong" style={[styles.date, { color: visuals.text }]}>{label}</ThemedText>
        <PeriodArrow direction={1} {...{ period, visuals, onMove }} />
      </View>
    </View>
  );
}

function PeriodArrow({ direction, period, visuals, onMove }: Omit<Props, 'onMode'> & { direction: -1 | 1 }) {
  const t = useTranslations(statisticsMessages);
  const target = movePeriod(period, direction);
  const disabled = target === period.start;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }}
      accessibilityLabel={t(direction < 0 ? 'previous' : 'next')} disabled={disabled}
      onPress={() => onMove(target)}
      style={({ pressed }) => [styles.arrow, { opacity: disabled ? 0.3 : pressed ? 0.6 : 1 }]}>
      <View style={[styles.chevron, { borderColor: visuals.text, transform: [{ rotate: direction < 0 ? '-135deg' : '45deg' }] }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs, paddingHorizontal: spacing.md },
  segments: { flexDirection: 'row', padding: spacing.half, borderRadius: radius.full },
  segment: { flex: 1, minHeight: sizing.controlMin, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, overflow: 'hidden', paddingVertical: spacing.xs },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  arrow: { width: sizing.controlComfortable, minHeight: sizing.controlComfortable, alignItems: 'center', justifyContent: 'center' },
  chevron: { width: 9, height: 9, borderTopWidth: 2, borderRightWidth: 2 },
  date: { flex: 1, textAlign: 'center' },
});
