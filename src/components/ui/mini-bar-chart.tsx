import Svg, { Rect } from 'react-native-svg';
import { Fragment } from 'react';

export type MiniBarChartProps = { data: number[]; color: string; height?: number; trackColor?: string; maxValue?: number };

export function MiniBarChart({ data, color, height = 40, trackColor = 'transparent', maxValue }: MiniBarChartProps) {
  const values = data.map((value) => (Number.isFinite(value) && value > 0 ? value : 0));
  const max = maxValue && maxValue > 0 ? maxValue : Math.max(0, ...values);
  const width = Math.max(1, values.length) * 12;
  const gap = 4;
  const barWidth = Math.max(2, (width - gap * Math.max(0, values.length - 1)) / Math.max(1, values.length));

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" accessibilityElementsHidden>
      {values.map((value, index) => {
        const ratio = max === 0 ? 0 : Math.min(value / max, 1);
        const barHeight = ratio === 0 ? 0 : Math.max(3, ratio * (height - 3));
        const x = index * (barWidth + gap);
        return (
          <Fragment key={index}>
            {trackColor !== 'transparent' ? <Rect x={x} y={0} width={barWidth} height={height} rx={barWidth / 2} fill={trackColor} /> : null}
            {barHeight > 0 ? <Rect x={x} y={height - barHeight} width={barWidth} height={barHeight} rx={barWidth / 2} fill={color} opacity={0.45 + ratio * 0.55} /> : null}
          </Fragment>
        );
      })}
    </Svg>
  );
}
