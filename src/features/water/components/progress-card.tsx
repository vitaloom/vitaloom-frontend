import { Image, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { layout, radius, shadows, sizing, spacing } from '@/theme';
import { Icon } from './water-icon';
import type { DailyWaterSummary } from '../types/water';

type Theme = import('../types/water').Theme;

export function ProgressCard({ summary, theme, label }: { summary: DailyWaterSummary; theme: Theme; label?: string }) {
  const { fontScale } = useWindowDimensions();
  const ringSize = Math.max(layout.progressRing, Math.round(layout.progressRing * Math.min(fontScale, 1.5)));
  const stroke = layout.progressStroke;
  const ringRadius = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const visibleProgress = Math.min(1, Math.max(0, summary.percent / 100));
  const percentText = Math.round(summary.percent);
  return (
    <View style={{ borderRadius: radius.xl, backgroundColor: theme.waterPanel, boxShadow: shadows.card }}>
      <LinearGradient colors={[theme.backgroundElement, theme.waterPanel]} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ minHeight: Math.max(layout.waterHero, ringSize + spacing.xxxl), overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: radius.xl, borderWidth: 1, borderColor: theme.waterPanelEdge }}>
        <Svg accessibilityElementsHidden width="100%" height={92} viewBox="0 0 360 92" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0 }}>
          <Path d="M0 38 C52 2 97 74 158 52 S260 8 360 50 L360 92 L0 92 Z" fill={theme.water} opacity={0.22} />
          <Path d="M0 59 C62 24 98 81 163 67 S280 27 360 66 L360 92 L0 92 Z" fill={theme.accentSoft} opacity={0.72} />
        </Svg>
        {label ? <ThemedText variant="labelStrong" style={{ alignSelf: 'flex-start', marginLeft: spacing.lg, marginTop: spacing.md }}>{label}</ThemedText> : null}
        <View accessible accessibilityRole="progressbar" accessibilityLabel={label ?? 'Water intake today'} accessibilityValue={{ min: 0, max: summary.goalMl, now: Math.min(summary.totalMl, summary.goalMl), text: `${summary.totalMl} of ${summary.goalMl} millilitres, ${percentText} percent` }} style={{ width: ringSize, height: ringSize, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.backgroundElement, boxShadow: shadows.floating, marginVertical: spacing.md }}>
          <Svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} style={{ position: 'absolute' }}>
            <Circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none" stroke={theme.waterTrack} strokeWidth={stroke} />
            {visibleProgress > 0 ? <Circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none" stroke={theme.accent} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${circumference * visibleProgress} ${circumference}`} rotation={-90} origin={`${ringSize / 2}, ${ringSize / 2}`} /> : null}
          </Svg>
          <Icon name="waterOutline" color={theme.water} size={sizing.iconLg} />
          <ThemedText variant="metricLarge" style={{ marginTop: spacing.xs }}>{summary.totalMl.toLocaleString()} ml</ThemedText>
          <ThemedText variant="subhead" themeColor="textSecondary">/ {summary.goalMl.toLocaleString()} ml</ThemedText>
          <View style={{ width: 88, height: 1, backgroundColor: theme.border, marginVertical: spacing.sm }} />
          <ThemedText variant="heading" themeColor="accent">{percentText}%</ThemedText>
        </View>
        {summary.percent >= 100 ? <ThemedText variant="labelStrong" themeColor="accent" style={{ marginBottom: spacing.md }}>Daily goal reached</ThemedText> : null}
      </LinearGradient>
      <Image accessibilityElementsHidden importantForAccessibility="no-hide-descendants" source={require('../../../../assets/images/leaves.png')} resizeMode="contain" style={{ position: 'absolute', right: spacing.xl, top: -spacing.xxl, width: 88, height: 88 }} />
      <Image accessibilityElementsHidden importantForAccessibility="no-hide-descendants" source={require('../../../../assets/images/bottle.png')} resizeMode="contain" style={{ position: 'absolute', right: -spacing.md, top: -spacing.xxl, width: 128, height: 128 }} />
    </View>
  );
}
