import { router, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { CircularProgress } from '@/components/ui/circular-progress';
import { MiniBarChart } from '@/components/ui/mini-bar-chart';
import { MiniLineChart } from '@/components/ui/mini-line-chart';
import { WellnessIcon } from '@/components/ui/wellness-icon';
import { useTheme } from '@/hooks/use-theme';
import { radius, shadows } from '@/theme';
import { type MetricSummary } from '../data/dashboard';

export function MetricCard({ metric, compact }: { metric: MetricSummary; compact: boolean }) {
  const theme = useTheme();
  const accent = metric.key === 'steps' ? theme.steps : metric.key === 'heart-rate' ? theme.heartRate : metric.key === 'water' ? theme.water : theme.sleep;
  const soft = metric.key === 'steps' ? theme.stepsSoft : metric.key === 'heart-rate' ? theme.heartRateSoft : metric.key === 'water' ? theme.waterPanel : theme.sleepSoft;
  const chartColor = accent;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${metric.title}, ${metric.value}${metric.unit ? ` ${metric.unit}` : ''}, ${metric.secondary}. Open ${metric.title} details`} onPress={() => router.push(metric.route as Href)} style={({ pressed }) => ({ width: '48.5%', minHeight: compact ? 143 : 151, padding: compact ? 12 : 14, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card, opacity: pressed ? 0.78 : 1, overflow: 'hidden' })}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 31, height: 31, borderRadius: 16, backgroundColor: soft, alignItems: 'center', justifyContent: 'center' }}>
        <WellnessIcon name={metric.key} color={accent} size={19} />
      </View>
      <Text style={{ color: theme.text, fontSize: compact ? 14 : 15, fontWeight: '600', flex: 1 }} numberOfLines={1}>{metric.title}</Text>
      <WellnessIcon name="chevron" color={theme.textSecondary} size={16} />
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: compact ? 8 : 10, minHeight: 54 }}>
      <View style={{ flexShrink: 1 }}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: theme.text, fontSize: metric.key === 'sleep' ? (compact ? 23 : 25) : compact ? 27 : 30, lineHeight: 34, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{metric.value}{metric.unit ? <Text style={{ fontSize: compact ? 15 : 17, fontWeight: '500' }}> {metric.unit}</Text> : null}</Text>
        <Text style={{ color: theme.textSecondary, fontSize: compact ? 12 : 13, marginTop: 1 }} numberOfLines={1}>{metric.secondary}</Text>
      </View>
      {metric.current !== undefined && metric.goal !== undefined ? <CircularProgress value={metric.current} maxValue={metric.goal} size={compact ? 50 : 54} strokeWidth={6} color={accent} trackColor={soft} /> : null}
    </View>
    <View style={{ height: compact ? 31 : 34, marginTop: 8 }}>
      {metric.key === 'heart-rate' ? <MiniLineChart data={metric.chart} color={chartColor} height={compact ? 31 : 34} showPoints /> : <MiniBarChart data={metric.chart} color={chartColor} height={compact ? 31 : 34} trackColor={soft} />}
    </View>
  </Pressable>;
}
