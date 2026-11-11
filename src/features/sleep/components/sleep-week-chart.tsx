import { StyleSheet, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { spacing } from '@/theme';
import type { DailySummary } from '../types/sleep';
import { sleepDay, sleepDuration } from '../utils/sleep-format';
import { SleepCard } from './sleep-ui';

const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const valueLabel = (entry: DailySummary) => entry.minutes !== null ? sleepDuration(entry.minutes)
  : entry.status === 'future' ? 'Upcoming' : entry.status === 'unverified' ? 'Unverified' : 'Not recorded';

export function SleepWeekChart({ days }: { days: readonly DailySummary[] }) {
  const theme = useTheme();
  const chartHeight = 118;
  const plotHeight = chartHeight - 6;
  const slotWidth = 40;
  const chartWidth = slotWidth * days.length;
  const max = Math.max(60, ...days.map((day) => day.minutes ?? 0));
  return <SleepCard>
    <ThemedText accessibilityRole="header" variant="heading">Daily Sleep Duration</ThemedText>
    <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      preserveAspectRatio="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[0, 0.25, 0.5, 0.75, 1].map((level) => {
        const y = plotHeight * (1 - level) + 3;
        return <Line key={level} x1={0} x2={chartWidth} y1={y} y2={y} stroke={theme.border} strokeDasharray={level ? '2 3' : undefined} />;
      })}
      {days.map((day, index) => {
        if (day.minutes === null) return null;
        const height = Math.max(2, day.minutes / max * plotHeight);
        return <Rect key={day.day} x={slotWidth * index + 8} y={chartHeight - 3 - height} width={24}
          height={height} rx={4} fill={theme.activity} />;
      })}
    </Svg>
    <View style={styles.row}>
      {days.map((day, index) => <View key={day.day} style={styles.column} accessible
        accessibilityLabel={`${weekday[index]}, ${sleepDay(day.day)}, ${valueLabel(day)}`}>
        <ThemedText variant="labelStrong" style={styles.center}>{weekday[index]}</ThemedText>
        <ThemedText variant="caption" themeColor="textSecondary" style={styles.center}>
          {day.minutes === null ? day.status === 'future' ? '···' : '—' : sleepDuration(day.minutes)}
        </ThemedText>
      </View>)}
    </View>
    <ThemedText variant="caption" themeColor="textSecondary">— No record · ··· Upcoming day</ThemedText>
  </SleepCard>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  column: { flex: 1, gap: spacing.xs, alignItems: 'center' },
  center: { textAlign: 'center' },
});
