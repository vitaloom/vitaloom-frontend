import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme';
import { useTranslations } from '@/i18n';
import { sleepMessages } from '../messages';
import { sleepDay } from '../utils/sleep-format';

type ChartDay = { date: string } & (
  | { state: 'recorded'; duration?: { minutes: number; label: string } }
  | { state: 'missing' | 'unverified' }
);

export function SleepSevenDayChart({ days, locale, labels, onRecordedDayPress }: {
  days: readonly ChartDay[];
  locale: string;
  labels: Record<ChartDay['state'], string>;
  onRecordedDayPress?: (day: string) => void;
}) {
  const theme = useTheme();
  const t = useTranslations(sleepMessages);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const coverageOnly = !days.some((day) => day.state === 'recorded' && day.duration);
  const maximum = Math.max(1, ...days.map((day) => day.state === 'recorded' ? day.duration?.minutes ?? 0 : 0));
  const marker = (state: ChartDay['state']) => state === 'recorded'
    ? <View style={[styles.dot, { backgroundColor: theme.sleep }]} />
    : <View style={[styles.marker, { borderColor: theme.textSecondary }]}>
      <SymbolView size={14} tintColor={theme.textSecondary} name={state === 'missing'
        ? { ios: 'moon.fill', android: 'bedtime', web: 'bedtime' }
        : { ios: 'questionmark', android: 'question_mark', web: 'question_mark' }} />
    </View>;
  const states = days.some((day) => day.state === 'unverified')
    ? ['recorded', 'missing', 'unverified'] as const : ['recorded', 'missing'] as const;

  return <>
    <View style={[styles.columns, { borderBottomColor: theme.border }]}>
      {days.map((day) => {
        const duration = day.state === 'recorded' ? day.duration : undefined;
        const meaning = duration?.label ?? labels[day.state];
        const columnProps = {
          accessible: true,
          accessibilityLabel: `${sleepDay(day.date, locale)}. ${meaning}`,
          style: styles.column,
        } as const;
        const columnContent = <>
          <ThemedText variant="caption" style={styles.center}>{day.date === today ? t('today') : `${day.date.slice(8, 10)}/${day.date.slice(5, 7)}`}</ThemedText>
          <View style={[styles.track, coverageOnly && styles.coverageTrack]}>
          {duration ? <>
            <ThemedText variant="caption" style={styles.center}>{duration.label}</ThemedText>
            <View style={[styles.bar, { height: 72 * duration.minutes / maximum, backgroundColor: theme.sleep }]} />
          </> : <View style={[styles.slot, day.state !== 'recorded' && {
            borderColor: theme.textSecondary, borderWidth: 1, borderStyle: 'dashed',
          }]}>{marker(day.state)}</View>}
          </View>
        </>;
        return day.state === 'recorded' && day.duration && onRecordedDayPress
          ? <Pressable key={day.date} {...columnProps} accessibilityRole="button"
            onPress={() => onRecordedDayPress(day.date)}>{columnContent}</Pressable>
          : <View key={day.date} {...columnProps}>{columnContent}</View>;
      })}
    </View>
    <View style={styles.legend}>
      {states.map((state) => <View key={state} style={styles.legendItem}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{marker(state)}</View>
        <ThemedText variant="caption" themeColor="textSecondary" style={styles.legendLabel}>{labels[state]}</ThemedText>
      </View>)}
    </View>
  </>;
}

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', gap: spacing.half, borderBottomWidth: StyleSheet.hairlineWidth },
  column: { flex: 1, minWidth: 0, alignItems: 'center', gap: spacing.xs },
  track: { flex: 1, width: '100%', minHeight: 116, alignItems: 'center', justifyContent: 'flex-end', gap: spacing.xs },
  coverageTrack: { minHeight: 42 },
  center: { textAlign: 'center' },
  bar: { width: '80%', borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm },
  slot: { width: '90%', height: 42, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  marker: { width: 22, height: 22, borderRadius: radius.full, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: radius.full },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, rowGap: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: '100%' },
  legendLabel: { flexShrink: 1 },
});
