import { router, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { CircularProgress } from '@/components/ui/circular-progress';
import { MiniBarChart } from '@/components/ui/mini-bar-chart';
import { WellnessIcon } from '@/components/ui/wellness-icon';
import { useTheme } from '@/hooks/use-theme';
import { radius, shadows } from '@/theme';
import { type MetricSummary } from '../data/dashboard';

export type HeartRateTile = { state: 'loading' | 'error' | 'empty' | 'ready'; bpm?: number; occurredAt?: string };
export type StepsTile = { state: 'loading' | 'error' | 'empty' | 'ready'; totalSteps?: number; buckets?: (number | null)[] };

export function MetricCard({ metric, compact, heartRate, steps, onRetry }: { metric: MetricSummary; compact: boolean; heartRate?: HeartRateTile; steps?: StepsTile; onRetry?: () => void }) {
  const theme = useTheme();
  const accent = metric.key === 'steps' ? theme.steps : metric.key === 'heart-rate' ? theme.heartRate : metric.key === 'water' ? theme.water : theme.sleep;
  const soft = metric.key === 'steps' ? theme.stepsSoft : metric.key === 'heart-rate' ? theme.heartRateSoft : metric.key === 'water' ? theme.waterPanel : theme.sleepSoft;
  const chartColor = accent;
  const heartRateError = metric.key === 'heart-rate' && heartRate?.state === 'error';
  const stepsError = metric.key === 'steps' && steps?.state === 'error';
  const value = metric.key === 'heart-rate' ? heartRate?.state === 'ready' ? `${heartRate.bpm}` : heartRate?.state === 'loading' ? '…' : heartRate?.state === 'empty' ? '—' : '!' : metric.key === 'steps' ? steps?.state === 'ready' && steps.totalSteps != null ? steps.totalSteps.toLocaleString() : steps?.state === 'loading' ? '…' : steps?.state === 'error' ? '!' : '—' : metric.value;
  const secondary = metric.key === 'heart-rate' ? heartRate?.state === 'ready' && heartRate.occurredAt ? `Đo lúc ${new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date(heartRate.occurredAt))}` : heartRate?.state === 'loading' ? 'Đang tải...' : heartRate?.state === 'error' ? 'Nhấn để thử lại' : heartRate?.state === 'empty' ? 'Chưa có phép đo' : '' : metric.key === 'steps' ? steps?.state === 'ready' ? steps.totalSteps == null ? 'Chưa có dữ liệu hôm nay' : 'Bước đã ghi nhận' : steps?.state === 'loading' ? 'Đang tải...' : steps?.state === 'error' ? 'Nhấn để thử lại' : '' : metric.secondary;
  return <Pressable accessibilityRole="button" accessibilityLabel={heartRateError || stepsError ? `${metric.title} data unavailable. Tap to retry.` : `${metric.title}, ${value}${metric.unit ? ` ${metric.unit}` : ''}, ${secondary}. Open ${metric.title} details`} onPress={() => heartRateError || stepsError ? onRetry?.() : router.push(metric.route as Href)} style={({ pressed }) => ({ width: '48.5%', minHeight: compact ? 143 : 151, padding: compact ? 12 : 14, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card, opacity: pressed ? 0.78 : 1, overflow: 'hidden' })}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 31, height: 31, borderRadius: 16, backgroundColor: soft, alignItems: 'center', justifyContent: 'center' }}>
        <WellnessIcon name={metric.key} color={accent} size={19} />
      </View>
      <Text style={{ color: theme.text, fontSize: compact ? 14 : 15, fontWeight: '600', flex: 1 }} numberOfLines={1}>{metric.title}</Text>
      <WellnessIcon name="chevron" color={theme.textSecondary} size={16} />
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: compact ? 8 : 10, minHeight: 54 }}>
      <View style={{ flexShrink: 1 }}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: heartRateError || stepsError ? theme.danger : theme.text, fontSize: metric.key === 'sleep' ? (compact ? 23 : 25) : compact ? 27 : 30, lineHeight: 34, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{value}{metric.key === 'heart-rate' && heartRate?.state === 'ready' ? <Text style={{ fontSize: compact ? 15 : 17, fontWeight: '500' }}> bpm</Text> : metric.key === 'steps' && steps?.state === 'ready' && steps.totalSteps != null ? <Text style={{ fontSize: compact ? 15 : 17, fontWeight: '500' }}> steps</Text> : metric.key !== 'heart-rate' && metric.key !== 'steps' && metric.unit ? <Text style={{ fontSize: compact ? 15 : 17, fontWeight: '500' }}> {metric.unit}</Text> : null}</Text>
        <Text style={{ color: theme.textSecondary, fontSize: compact ? 12 : 13, marginTop: 1 }} numberOfLines={1}>{secondary}</Text>
      </View>
      {metric.current !== undefined && metric.goal !== undefined ? <CircularProgress value={metric.current} maxValue={metric.goal} size={compact ? 50 : 54} strokeWidth={6} color={accent} trackColor={soft} /> : null}
    </View>
    {metric.key === 'heart-rate' ? null : metric.key === 'steps' ? steps?.state === 'ready' && steps.buckets?.some((value) => value != null) ? <View style={{ height: compact ? 31 : 34, marginTop: 8 }}><MiniBarChart data={steps.buckets.map((value) => value ?? 0)} color={chartColor} height={compact ? 31 : 34} trackColor={soft} /></View> : null : <View style={{ height: compact ? 31 : 34, marginTop: 8 }}><MiniBarChart data={metric.chart} color={chartColor} height={compact ? 31 : 34} trackColor={soft} /></View>}
  </Pressable>;
}
