import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { radius, shadows, sizing, spacing } from '@/theme';
import { AmountTile } from './amount-tile';
import { Icon } from './water-icon';
import type { Theme } from '../types/water';

export function QuickAddCard({ onAdd, onCustom, submitting, theme }: { onAdd: (amount: 100 | 250 | 500) => void; onCustom: () => void; submitting: boolean; theme: Theme }) {
  const [choice, setChoice] = useState<100 | 250 | 500>(250);
  return (
    <View style={{ padding: spacing.md, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm }}>
        <ThemedText variant="heading">Quick Add</ThemedText>
        <ThemedText variant="subhead" themeColor="textSecondary">Choose amount</ThemedText>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {([100, 250, 500] as const).map((value) => <AmountTile key={value} value={value} selected={choice === value} onPress={() => setChoice(value)} theme={theme} />)}
        <AmountTile value="custom" selected={false} onPress={onCustom} theme={theme} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Add ${choice} millilitres now`} accessibilityState={{ disabled: submitting, busy: submitting }} disabled={submitting} onPress={() => onAdd(choice)} style={({ pressed }) => ({ minHeight: sizing.controlComfortable, borderRadius: radius.lg, backgroundColor: theme.accent, opacity: submitting ? 0.45 : pressed ? 0.8 : 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm, boxShadow: shadows.card })}>
        <Icon name="check" color={theme.onAccent} />
        <ThemedText variant="bodyStrong" themeColor="onAccent">{submitting ? 'Adding…' : `Add +${choice} ml · Log Now`}</ThemedText>
      </Pressable>
    </View>
  );
}
