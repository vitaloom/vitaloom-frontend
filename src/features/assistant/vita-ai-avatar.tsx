import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme';

export function VitaAiAvatar({ size = 52 }: { size?: number }) {
  const theme = useTheme();
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Svg width={size} height={size} viewBox="0 0 52 52">
    <Defs>
      <LinearGradient id="vitaAiBackground" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0" stopColor={palette.mint[300]} />
        <Stop offset="0.42" stopColor={theme.sleep} />
        <Stop offset="1" stopColor={palette.teal[700]} />
      </LinearGradient>
    </Defs>
    <Circle cx="26" cy="26" r="26" fill="url(#vitaAiBackground)" />
    <Circle cx="26" cy="27" r="16" fill="rgba(255,255,255,0.97)" />
    <Path d="M12 23a4 4 0 0 1 4-4h20a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z"
      fill={palette.neutral[0]} stroke={palette.mint[600]} strokeWidth="1.4" />
    <Path d="M12 25H9v7h5m26-7h3v7h-5" fill="none" stroke={palette.mint[600]} strokeWidth="2" />
    <Circle cx="21" cy="27" r="1.7" fill={palette.teal[700]} />
    <Circle cx="31" cy="27" r="1.7" fill={palette.teal[700]} />
    <Path d="M21 32q5 4 10 0" fill="none" stroke={palette.mint[600]} strokeWidth="1.7" strokeLinecap="round" />
    <Path d="M35 5.5l2.1 4.2 4.5 2.1-4.5 2.2-2.1 4.4-2.2-4.4-4.3-2.2 4.3-2.1z"
      fill={palette.violet[500]} stroke="white" strokeWidth="1.2" />
    <Path d="M19 40c2 4 7 7 7 7s5-3 7-7c-5 2-9 2-14 0z" fill={palette.teal[700]} />
    </Svg>
  </View>;
}
