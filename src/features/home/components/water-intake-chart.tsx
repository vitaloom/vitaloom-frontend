import { Fragment } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { spacing } from '@/theme';

type WaterLogPoint = { id: string; amountMl: number; loggedAt: string };

export function WaterIntakeChart({ logs, locale, emptyLabel, scaleLabel }: { logs: WaterLogPoint[]; locale: string; emptyLabel: string; scaleLabel: string }) {
  const theme = useTheme();
  const orderedLogs = [...logs].sort((a, b) => Date.parse(a.loggedAt) - Date.parse(b.loggedAt));
  if (orderedLogs.length === 0) return <ThemedText variant="caption" themeColor="textSecondary" style={{ marginTop: spacing.sm }}>{emptyLabel}</ThemedText>;

  const maxAmount = Math.max(500, ...orderedLogs.map((log) => log.amountMl));
  const maxScale = Math.ceil(maxAmount / 500) * 500;
  const plotTop = 4;
  const plotHeight = 82;
  const labelWidth = 42;
  const slotWidth = 58;
  const chartWidth = labelWidth + orderedLogs.length * slotWidth;
  const chartHeight = plotTop + plotHeight + 24;
  const timeFormat = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  const ticks = Array.from({ length: maxScale / 500 + 1 }, (_, index) => index * 500);

  return <View accessible accessibilityRole="image" accessibilityLabel={`${scaleLabel}. ${orderedLogs.map((log) => `${timeFormat.format(new Date(log.loggedAt))}: ${log.amountMl} ml`).join(', ')}`} style={{ marginTop: spacing.sm }}>
    <ThemedText variant="caption" themeColor="textSecondary">{scaleLabel}</ThemedText>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
      <Svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} accessibilityElementsHidden>
        {ticks.map((tick) => {
          const y = plotTop + plotHeight - (tick / maxScale) * plotHeight;
          return <Fragment key={tick}>
            <Line x1={labelWidth} y1={y} x2={chartWidth} y2={y} stroke={theme.border} strokeWidth={1} />
            <SvgText x={labelWidth - 5} y={y + 3} fill={theme.textSecondary} fontSize={9} textAnchor="end">{tick}</SvgText>
          </Fragment>;
        })}
        {orderedLogs.map((log, index) => {
          const x = labelWidth + index * slotWidth + (slotWidth - 22) / 2;
          const barHeight = Math.max(2, (log.amountMl / maxScale) * plotHeight);
          const time = timeFormat.format(new Date(log.loggedAt));
          return <Fragment key={log.id}>
            <Rect x={x} y={plotTop + plotHeight - barHeight} width={22} height={barHeight} rx={7} fill={theme.water} />
            <SvgText x={labelWidth + index * slotWidth + slotWidth / 2} y={chartHeight - 5} fill={theme.textSecondary} fontSize={10} textAnchor="middle">{time}</SvgText>
          </Fragment>;
        })}
      </Svg>
    </ScrollView>
  </View>;
}
