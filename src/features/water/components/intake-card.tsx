import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { radius, shadows, sizing, spacing } from '@/theme';
import { Icon } from './water-icon';
import { type Intake, type Theme } from '../types/water';

export function IntakeCard({ entries, theme }: { entries: Intake[]; theme: Theme }) {
  return (
    <View style={{ padding: spacing.md, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card, gap: spacing.sm }}>
      <ThemedText variant="heading">Today’s Intake</ThemedText>
      {entries.slice(0, 4).map((entry, index) => <View key={entry.id} style={{ minHeight: sizing.controlMin, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: index === Math.min(entries.length, 4) - 1 ? 0 : 1, borderBottomColor: theme.border }}>
        <View style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: theme.backgroundSelected }}><Icon name="waterOutline" color={theme.accent} /></View>
        <ThemedText variant="bodyStrong" style={{ flex: 1 }}>{entry.amount} ml</ThemedText>
        <ThemedText variant="subhead" themeColor="textSecondary">{entry.time}</ThemedText>
      </View>)}
    </View>
  );
}
