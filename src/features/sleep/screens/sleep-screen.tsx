import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, shadows, spacing } from '@/theme';

export default function SleepScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.lg, paddingHorizontal: spacing.md }}>
    <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <ThemedText variant="labelStrong" themeColor="sleep">REST & RECOVERY</ThemedText>
        <ThemedText variant="largeTitle">Sleep Tracking</ThemedText>
        <ThemedText variant="body" themeColor="textSecondary">Your rest at a glance.</ThemedText>
      </View>
      <View style={{ padding: spacing.lg, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card, gap: spacing.sm }}>
        <ThemedText variant="label" themeColor="textSecondary">LAST NIGHT</ThemedText>
        <ThemedText variant="display">7h 30m</ThemedText>
        <ThemedText variant="body" themeColor="textSecondary">of 8 hours · 94% of your goal</ThemedText>
      </View>
      <View style={{ padding: spacing.md, borderRadius: radius.lg, backgroundColor: theme.backgroundElement, boxShadow: shadows.card, gap: spacing.xs }}>
        <ThemedText variant="heading">Tracking details coming soon</ThemedText>
        <ThemedText variant="body" themeColor="textSecondary">Your sleep journal and trends will appear here.</ThemedText>
      </View>
    </View>
  </ScrollView>;
}
