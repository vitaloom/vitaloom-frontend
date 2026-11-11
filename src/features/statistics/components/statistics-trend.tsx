import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

const width = 120;
const height = 48;
const inset = 4;

export function StatisticsTrend({ data, color, line }: { data: readonly (number | null)[]; color: string; line: boolean }) {
  const gradient = useId().replace(/[^a-zA-Z0-9]/g, '');
  const observed = data.filter((value) => value != null);
  if (!observed.length) return null;

  const max = Math.max(...observed);
  const min = Math.min(...observed);
  const span = Math.max(1, max - min);
  const slot = width / data.length;
  const points = data.map((value, index) => value == null ? null : {
    x: data.length === 1 ? width / 2 : inset + index * (width - 2 * inset) / (data.length - 1),
    y: height - inset - (height - inset * 2) * (max === min ? 0.5 : (value - min) / span),
  });
  const path = points.map((point, index) => {
    if (!point) return '';
    return `${points[index - 1] ? 'L' : 'M'} ${point.x} ${point.y}`;
  }).join(' ');

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.48} />
            <Stop offset="1" stopColor={color} stopOpacity={0.9} />
          </LinearGradient>
        </Defs>
        {line ? <>
          <Path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => point && (observed.length <= 14 || (!points[index - 1] && !points[index + 1]))
            ? <Circle key={index} cx={point.x} cy={point.y} r={observed.length <= 14 ? 2.8 : 1.4} fill={color} />
            : null)}
        </> : data.map((value, index) => {
          if (value == null) return null;
          const barHeight = max > 0 ? Math.max(1, (value / max) * (height - 2)) : 1;
          return <Rect key={index} x={slot * (index + 0.12)} y={height - barHeight} width={slot * 0.76} height={barHeight}
            rx={Math.min(4, slot * 0.2)} fill={`url(#${gradient})`} />;
        })}
      </Svg>
    </View>
  );
}
