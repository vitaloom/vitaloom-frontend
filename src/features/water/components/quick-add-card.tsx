import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { radius, shadows, sizing, spacing } from '@/theme';
import { AmountTile } from './amount-tile';
import { Icon } from './water-icon';
import { dailyGoal } from '../data/intake';
import { type AmountChoice, type Theme } from '../types/water';

export function QuickAddCard({ onAdd, theme }: { onAdd: (amount: number) => void; theme: Theme }) {
  const [choice, setChoice] = useState<AmountChoice>(250);
  const [customAmount, setCustomAmount] = useState('');
  const amount = choice === 'custom' ? Number(customAmount) : choice;
  const valid = Number.isInteger(amount) && amount > 0 && amount <= dailyGoal;
  return (
    <View style={{ padding: spacing.md, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm }}>
        <ThemedText variant="heading">Quick Add</ThemedText>
        <ThemedText variant="subhead" themeColor="textSecondary">Choose amount</ThemedText>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {([100, 250, 500, 'custom'] as const).map((value) => <AmountTile key={value} value={value} selected={choice === value} onPress={() => setChoice(value)} theme={theme} />)}
      </View>
      {choice === 'custom' ? <TextInput accessibilityLabel="Custom water amount in millilitres" placeholder="Enter 1–2000 ml" placeholderTextColor={theme.textSecondary} keyboardType="number-pad" value={customAmount} onChangeText={setCustomAmount} style={{ minHeight: sizing.controlComfortable, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, color: theme.text, backgroundColor: theme.background }} /> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={valid ? `Add ${amount} millilitres to today's intake` : 'Enter a valid amount between 1 and 2000 millilitres'} accessibilityState={{ disabled: !valid }} disabled={!valid} onPress={() => onAdd(amount)} style={({ pressed }) => ({ minHeight: sizing.controlComfortable, borderRadius: radius.lg, backgroundColor: theme.accent, opacity: !valid ? 0.45 : pressed ? 0.8 : 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm, boxShadow: shadows.card })}>
        <Icon name="check" color={theme.onAccent} />
        <ThemedText variant="bodyStrong" themeColor="onAccent">Add +{valid ? amount : '—'} ml · Log Now</ThemedText>
      </Pressable>
    </View>
  );
}
