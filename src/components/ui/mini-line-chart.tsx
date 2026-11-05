import Svg, { Defs, LinearGradient, Path, Stop, Polyline, Circle } from 'react-native-svg';

export type MiniLineChartProps = { data: number[]; color: string; height?: number; showPoints?: boolean };

export function MiniLineChart({ data, color, height = 42, showPoints = false }: MiniLineChartProps) {
  const values = data.map((value) => (Number.isFinite(value) ? value : 0));
  const width = 160;
  const inset = 4;
  const usableHeight = Math.max(1, height - inset * 2);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const range = Math.max(1, max - min);
  const points = values.map((value, index) => {
    const x = values.length < 2 ? width / 2 : inset + (index / (values.length - 1)) * (width - inset * 2);
    const y = height - inset - ((value - min) / range) * usableHeight;
    return `${x},${y}`;
  });
  const linePoints = points.join(' ');
  const fillPath = values.length > 1 ? `M ${points[0]} L ${points.slice(1).join(' L ')} L ${width - inset},${height} L ${inset},${height} Z` : '';

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" accessibilityElementsHidden>
      <Defs>
        <LinearGradient id="mini-line-fade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.22" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {values.length > 1 ? <Path d={fillPath} fill="url(#mini-line-fade)" /> : null}
      {values.length > 1 ? <Polyline points={linePoints} fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" /> : null}
      {showPoints && values.length > 0 ? (
        <>
          {points.map((point, index) => {
            const [cx, cy] = point.split(',');
            return <Circle key={index} cx={Number(cx)} cy={Number(cy)} r={2.8} fill={color} />;
          })}
        </>
      ) : null}
    </Svg>
  );
}
