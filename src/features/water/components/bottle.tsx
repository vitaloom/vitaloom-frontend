import { View } from 'react-native';

import { radius, spacing } from '@/theme';
import { type Theme } from '../types/water';

// Decorative illustration geometry is local to this artwork, separate from layout tokens.
export function Bottle({ theme }: { theme: Theme }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', right: spacing.md, top: spacing.md, width: 74, height: 116, transform: [{ rotate: '19deg' }], opacity: 0.8 }}>
      <View style={{ width: 34, height: 14, alignSelf: 'center', backgroundColor: theme.accent, borderRadius: radius.sm }} />
      <View style={{ width: 52, height: 12, alignSelf: 'center', backgroundColor: theme.water, borderRadius: radius.sm }} />
      <View style={{ width: 64, height: 88, alignSelf: 'center', overflow: 'hidden', borderWidth: 2, borderColor: theme.water, backgroundColor: theme.backgroundElement, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl }}>
        <View style={{ position: 'absolute', bottom: 0, width: '100%', height: '42%', backgroundColor: theme.waterTrack }} />
        <View style={{ position: 'absolute', left: spacing.sm, top: spacing.md, width: 7, height: 7, borderRadius: radius.full, backgroundColor: theme.water }} />
        <View style={{ position: 'absolute', right: spacing.md, top: spacing.xl, width: 5, height: 5, borderRadius: radius.full, backgroundColor: theme.water }} />
      </View>
    </View>
  );
}
