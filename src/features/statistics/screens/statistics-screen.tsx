import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, shadows, spacing } from '@/theme';

export default function StatisticsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: spacing.md }}>
      <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <ThemedText variant="labelStrong" themeColor="accent">YOUR WELLNESS</ThemedText>
          <ThemedText variant="largeTitle">Statistics</ThemedText>
          <ThemedText variant="body" themeColor="textSecondary">A clearer picture of your daily habits.</ThemedText>
        </View>
        <View style={{ padding: spacing.lg, minHeight: 180, justifyContent: 'center', gap: spacing.sm, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card }}>
          <ThemedText variant="heading">Your overview is on its way</ThemedText>
          <ThemedText variant="body" themeColor="textSecondary">Statistics will appear here as your wellness history becomes available.</ThemedText>
        </View>
      </View>
    </ScrollView>
  );
}
