import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { layout, radius, shadows, sizing, spacing } from '@/theme';
import { Bottle } from './bottle';
import { Icon } from './water-icon';
import { dailyGoal } from '../data/intake';
import { type Theme } from '../types/water';

export function ProgressCard({ total, theme }: { total: number; theme: Theme }) {
  const percent = Math.min(Math.round((total / dailyGoal) * 100), 100);
  return (
    <View style={{ borderRadius: radius.xl, backgroundColor: theme.waterPanel, boxShadow: shadows.card }}>
      <View style={{ height: layout.waterHero, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: radius.xl, borderWidth: 1, borderColor: theme.waterPanelEdge, experimental_backgroundImage: `linear-gradient(145deg, ${theme.backgroundElement}, ${theme.waterPanel})` }}>
        <View accessibilityElementsHidden style={{ position: 'absolute', bottom: -64, left: -38, width: 440, height: 118, borderRadius: radius.full, backgroundColor: theme.water, opacity: 0.18, transform: [{ rotate: '-6deg' }] }} />
        <View accessibilityElementsHidden style={{ position: 'absolute', bottom: -67, left: -44, width: 440, height: 100, borderRadius: radius.full, backgroundColor: theme.accentSoft, opacity: 0.8, transform: [{ rotate: '7deg' }] }} />
        <Bottle theme={theme} />
        <View accessible accessibilityRole="progressbar" accessibilityLabel="Water intake today" accessibilityValue={{ min: 0, max: dailyGoal, now: Math.min(total, dailyGoal), text: `${total} millilitres of ${dailyGoal} millilitres, ${percent} percent` }} style={{ width: layout.progressRing, height: layout.progressRing, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' }}>
          {Array.from({ length: 72 }, (_, index) => {
            const angle = (index / 72) * Math.PI * 2;
            const distance = (layout.progressRing - layout.progressStroke) / 2;
            return <View key={index} pointerEvents="none" style={{ position: 'absolute', left: layout.progressRing / 2 + distance * Math.sin(angle) - 5, top: layout.progressRing / 2 - distance * Math.cos(angle) - layout.progressStroke / 2, width: 10, height: layout.progressStroke, borderRadius: radius.full, backgroundColor: index < Math.round((percent / 100) * 72) ? theme.accent : theme.waterTrack, transform: [{ rotate: `${(index / 72) * 360}deg` }] }} />;
          })}
          <Icon name="water" color={theme.water} size={sizing.iconLg} />
          <ThemedText variant="metricLarge" style={{ marginTop: spacing.sm }}>{(total / 1000).toFixed(1)} L</ThemedText>
          <ThemedText variant="subhead" themeColor="textSecondary">/ {(dailyGoal / 1000).toFixed(1)} L</ThemedText>
          <View style={{ width: 88, height: 1, backgroundColor: theme.border, marginVertical: spacing.sm }} />
          <ThemedText variant="heading" themeColor="accent">{percent}%</ThemedText>
        </View>
        <View accessibilityElementsHidden style={{ position: 'absolute', left: spacing.xl, top: 120, width: 7, height: 7, borderRadius: radius.full, borderWidth: 1, borderColor: theme.water }} />
        <View accessibilityElementsHidden style={{ position: 'absolute', right: spacing.xl, bottom: 62, width: 11, height: 11, borderRadius: radius.full, borderWidth: 1, borderColor: theme.water }} />
      </View>
    </View>
  );
}
