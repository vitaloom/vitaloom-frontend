import Svg, { Circle } from 'react-native-svg';
import { Text, View } from 'react-native';

import { typography } from '@/theme';

export type CircularProgressProps = {
  value: number;
  maxValue: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  showPercentage?: boolean;
};

export function CircularProgress({
  value,
  maxValue,
  size = 76,
  strokeWidth = 8,
  color = '#159C98',
  trackColor = '#CEF1EE',
  showPercentage = true,
}: CircularProgressProps) {
  const safeMax = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 0;
  const safeValue = Number.isFinite(value) && value > 0 ? value : 0;
  const progress = safeMax === 0 ? 0 : Math.min(safeValue / safeMax, 1);
  const percentage = Math.round(progress * 100);
  const radius = Math.max(0, (size - strokeWidth) / 2);
  const circumference = 2 * Math.PI * radius;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Progress"
      accessibilityValue={{ min: 0, max: 100, now: percentage, text: `${percentage}%` }}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        {progress > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference * progress} ${circumference}`}
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        ) : null}
      </Svg>
      {showPercentage ? (
        <Text
          accessible={false}
          style={{ position: 'absolute', color, fontSize: typography.labelStrong.fontSize, fontWeight: '700' }}
        >
          {percentage}%
        </Text>
      ) : null}
    </View>
  );
}
