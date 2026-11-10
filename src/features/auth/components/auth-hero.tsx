import { Image, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { palette, radius, spacing, typography } from '@/theme';

export function AuthHero() {
  const theme = useTheme();
  return <View accessible={false} style={{ flex: 1, minHeight: 330, overflow: 'hidden', alignItems: 'center', backgroundColor: theme.background }}>
    <View style={{ position: 'absolute', top: '20%', left: -100, width: 260, height: 260, borderRadius: radius.full, backgroundColor: theme.accentSoft }} />
    <View style={{ position: 'absolute', bottom: -120, right: -90, width: 280, height: 280, borderRadius: radius.full, backgroundColor: theme.surfaceTint }} />
    <View style={{ marginTop: spacing.md, alignItems: 'center', gap: spacing.xs, zIndex: 2 }}>
      <View style={{ width: 42, height: 34, flexDirection: 'row', justifyContent: 'center' }}><View style={{ width: 20, height: 28, borderTopLeftRadius: 20, borderBottomRightRadius: 20, backgroundColor: palette.mint[600], transform: [{ rotate: '-25deg' }] }} /><View style={{ width: 20, height: 28, borderTopRightRadius: 20, borderBottomLeftRadius: 20, backgroundColor: palette.teal[500], transform: [{ rotate: '25deg' }] }} /></View>
      <ThemedText variant="title" style={{ color: theme.text, fontWeight: '800' }}>Healthy Check</ThemedText>
    </View>
    <Image source={require('../../../../assets/images/wellness-stretch.png')} resizeMode="contain" style={{ position: 'absolute', width: '96%', height: '82%', bottom: -42, left: '-12%' }} />
    <ThemedText style={{ position: 'absolute', right: spacing.md, top: '38%', width: '35%', color: theme.accent, textAlign: 'center', fontStyle: 'italic', fontSize: typography.heading.fontSize, lineHeight: typography.heading.lineHeight }}>Better Health{ '\n' }Brighter Days</ThemedText>
  </View>;
}
