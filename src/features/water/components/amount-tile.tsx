import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { layout, radius, shadows, sizing } from '@/theme';
import { Icon } from './water-icon';
import { type AmountChoice, type Theme } from '../types/water';

export function AmountTile({ value, selected, onPress, theme }: { value: AmountChoice; selected: boolean; onPress: () => void; theme: Theme }) {
  const custom = value === 'custom';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={custom ? 'Custom amount' : `${value} millilitres`} accessibilityState={{ selected }} style={({ pressed }) => ({ flex: 1, minHeight: layout.quickTileMin, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, borderWidth: 1, borderColor: selected ? theme.accent : theme.border, backgroundColor: selected ? theme.accent : theme.backgroundElement, opacity: pressed ? 0.78 : 1, boxShadow: shadows.card })}>
      {custom ? <Icon name="edit" color={selected ? theme.onAccent : theme.accent} /> : null}
      <ThemedText variant={custom ? 'labelStrong' : 'heading'} themeColor={selected ? 'onAccent' : 'text'}>{custom ? 'Custom' : value}</ThemedText>
      {!custom ? <ThemedText variant="label" themeColor={selected ? 'onAccent' : 'textSecondary'}>ml</ThemedText> : null}
      {selected ? <View style={{ position: 'absolute', top: -8, right: -5, width: 22, height: 22, borderRadius: radius.full, backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" color={theme.accent} size={sizing.iconSm} /></View> : null}
    </Pressable>
  );
}
