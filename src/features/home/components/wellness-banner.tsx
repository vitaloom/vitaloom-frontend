import { LinearGradient } from 'expo-linear-gradient';
import { Image, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import { radius, shadows, spacing } from '@/theme';

export function WellnessBanner({ compact }: { compact: boolean }) {
  const theme = useTheme();
  return <LinearGradient colors={[theme.backgroundElement, theme.accentSoft, theme.stepsSoft]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 150, borderRadius: radius.xl, overflow: 'hidden', justifyContent: 'center', boxShadow: shadows.card }}>
    <Svg width="100%" height={86} viewBox="0 0 360 86" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0 }} accessibilityElementsHidden>
      <Path d="M0 48 C35 28 50 80 100 59 S170 61 215 45 S290 45 360 5 L360 86 L0 86Z" fill={theme.waterTrack} opacity={0.55} />
      <Path d="M0 60 C45 36 60 74 110 66 S176 42 225 62 S304 74 360 30 L360 86 L0 86Z" fill={theme.water} opacity={0.19} />
    </Svg>
    <Svg width={126} height={130} viewBox="0 0 126 130" style={{ position: 'absolute', right: 2, bottom: -10 }} accessibilityElementsHidden>
      <Path d="M52 127 C54 70 59 38 91 10 M49 105 C25 73 18 65 9 60 M57 80 C97 62 102 50 113 36" stroke={theme.steps} strokeWidth={3} fill="none" opacity={0.55} />
      <Path d="M50 84 C21 85 9 72 6 58 C28 58 43 64 50 84 M69 58 C75 31 93 21 112 23 C107 42 93 55 69 58 M62 102 C82 82 104 83 120 88 C110 105 89 112 62 102" fill={theme.steps} opacity={0.35} />
    </Svg>
    <Image source={require('../../../../assets/images/wellness-stretch.png')} resizeMode="contain" style={{ position: 'absolute', right: -6, bottom: -28, width: compact ? 139 : 163, height: compact ? 178 : 207 }} accessibilityIgnoresInvertColors />
    <View style={{ paddingLeft: spacing.lg, width: compact ? '70%' : '66%', zIndex: 1 }}>
      <Text style={{ color: theme.text, fontSize: compact ? 19 : 22, lineHeight: compact ? 24 : 27, fontWeight: '700' }}>A healthier you{'\n'}happier tomorrow</Text>
      <Text style={{ color: theme.textSecondary, fontSize: compact ? 12 : 13, lineHeight: 18, marginTop: 9 }}>Keep going. You’re doing great.</Text>
    </View>
  </LinearGradient>;
}
