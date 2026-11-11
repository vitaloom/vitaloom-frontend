import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { WellnessIcon } from '@/components/ui/wellness-icon';
import { useTheme } from '@/hooks/use-theme';
import { radius, shadows } from '@/theme';
import { useTranslations } from '@/i18n';
import { homeMessages } from '../messages';

export function Reminder() {
  const theme = useTheme();
  const t = useTranslations(homeMessages);
  return <LinearGradient colors={[theme.backgroundElement, theme.accentSoft]} style={{ minHeight: 77, borderRadius: radius.xl, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden', boxShadow: shadows.card }}>
    <Svg width="100%" height={42} viewBox="0 0 360 42" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0 }} accessibilityElementsHidden><Path d="M0 23 C55 10 57 44 116 28 S205 32 250 34 S313 15 360 12 L360 42 L0 42Z" fill={theme.water} opacity={0.13} /></Svg>
    <View style={{ width: 49, height: 49, borderRadius: 25, backgroundColor: theme.stepsSoft, alignItems: 'center', justifyContent: 'center' }}><WellnessIcon name="sprout" color={theme.steps} size={30} /></View>
    <View style={{ flex: 1 }}>
      <Text style={{ color: theme.text, fontSize: 17, lineHeight: 22, fontWeight: '700' }}>{t('home.reminderTitle')}</Text>
      <Text style={{ color: theme.textSecondary, fontSize: 11, lineHeight: 15, marginTop: 3 }}>{t('home.reminderDescription')}</Text>
    </View>
  </LinearGradient>;
}
