import { Image, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { layout, radius, shadows, sizing, spacing } from '@/theme';
import { Icon } from './water-icon';
import { dailyGoal } from '../data/intake';
import { type Theme } from '../types/water';

export function ProgressCard({ total, theme }: { total: number; theme: Theme }) {
  const { fontScale } = useWindowDimensions();
  const safeTotal = Math.max(0, total);
  const percent = Math.min(Math.round((safeTotal / dailyGoal) * 100), 100);
  const progress = percent / 100;
  const ringSize = Math.max(layout.progressRing, Math.round(layout.progressRing * Math.min(fontScale, 1.5)));
  const stroke = layout.progressStroke;
  const ringRadius = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * ringRadius;

  return (
    <View style={{ borderRadius: radius.xl, backgroundColor: theme.waterPanel, boxShadow: shadows.card, overflow: 'visible' }}>
      <LinearGradient colors={[theme.backgroundElement, theme.waterPanel]} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ minHeight: Math.max(layout.waterHero, ringSize + spacing.xxxl), overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: radius.xl, borderWidth: 1, borderColor: theme.waterPanelEdge }}>
        {/* Decorative waves and artwork are separate from the progress value. */}
        <Svg accessibilityElementsHidden width="100%" height={92} viewBox="0 0 360 92" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0 }}>
          <Path d="M0 38 C52 2 97 74 158 52 S260 8 360 50 L360 92 L0 92 Z" fill={theme.water} opacity={0.22} />
          <Path d="M0 59 C62 24 98 81 163 67 S280 27 360 66 L360 92 L0 92 Z" fill={theme.accentSoft} opacity={0.72} />
          <Path d="M0 48 C58 13 104 75 170 56 S284 20 360 56" fill="none" stroke={theme.backgroundElement} strokeWidth={3} opacity={0.7} />
        </Svg>
        <View accessible accessibilityRole="progressbar" accessibilityLabel="Water intake today" accessibilityValue={{ min: 0, max: dailyGoal, now: Math.min(safeTotal, dailyGoal), text: `${safeTotal} millilitres of ${dailyGoal} millilitres, ${percent} percent` }} style={{ width: ringSize, height: ringSize, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.backgroundElement, boxShadow: shadows.floating }}>
          <Svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} style={{ position: 'absolute' }}>
            <Defs><SvgGradient id="waterProgress" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={theme.water} /><Stop offset="1" stopColor={theme.accent} /></SvgGradient></Defs>
            <Circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none" stroke={theme.waterTrack} strokeWidth={stroke} />
            {progress > 0 ? <Circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none" stroke="url(#waterProgress)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${circumference * progress} ${circumference}`} rotation={-90} origin={`${ringSize / 2}, ${ringSize / 2}`} /> : null}
          </Svg>
          <Icon name="waterOutline" color={theme.water} size={sizing.iconLg} />
          <ThemedText variant="metricLarge" style={{ marginTop: spacing.xs }}>{(safeTotal / 1000).toFixed(1)} L</ThemedText>
          <ThemedText variant="subhead" themeColor="textSecondary">/ {(dailyGoal / 1000).toFixed(1)} L</ThemedText>
          <View style={{ width: 88, height: 1, backgroundColor: theme.border, marginVertical: spacing.sm }} />
          <ThemedText variant="heading" themeColor="accent">{percent}%</ThemedText>
        </View>
        <View accessibilityElementsHidden style={{ position: 'absolute', left: spacing.xl, top: '36%', width: 7, height: 7, borderRadius: radius.full, borderWidth: 1, borderColor: theme.water }} />
        <View accessibilityElementsHidden style={{ position: 'absolute', left: spacing.md, bottom: spacing.lg, width: 5, height: 5, borderRadius: radius.full, backgroundColor: theme.water, opacity: 0.5 }} />
        <View accessibilityElementsHidden style={{ position: 'absolute', right: spacing.xl, bottom: spacing.xl, width: 11, height: 11, borderRadius: radius.full, borderWidth: 1, borderColor: theme.water }} />
      </LinearGradient>
      <Image accessibilityElementsHidden importantForAccessibility="no-hide-descendants" source={require('../../../../assets/images/leaves.png')} resizeMode="contain" style={{ position: 'absolute', right: spacing.xl, top: -spacing.xxl, width: 88, height: 88 }} />
      <Image accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      source={require('../../../../assets/images/bottle.png')}
      resizeMode="contain"
      style={{ position: 'absolute', right: -spacing.md, top: -spacing.xxl, width: 128, height: 128 }}
    />
    </View>
  );
}
