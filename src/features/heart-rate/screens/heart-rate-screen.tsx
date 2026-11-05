import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, shadows, sizing, spacing } from '@/theme';

export default function HeartRateScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg, paddingHorizontal: spacing.md }}>
      <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', flex: 1, gap: spacing.lg }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Home" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={{ minHeight: sizing.controlMin, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: spacing.sm }}>
          <ThemedText variant="bodyStrong" themeColor="accent">‹  Home</ThemedText>
        </Pressable>
        <View style={{ gap: spacing.xs }}>
          <ThemedText variant="labelStrong" themeColor="danger">HEART HEALTH</ThemedText>
          <ThemedText variant="largeTitle">Heart Rate</ThemedText>
          <ThemedText variant="body" themeColor="textSecondary">A quick view of your latest reading.</ThemedText>
        </View>
        <View style={{ padding: spacing.lg, gap: spacing.xs, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card }}>
          <ThemedText variant="label" themeColor="textSecondary">LATEST READING</ThemedText>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
            <ThemedText variant="display">72</ThemedText>
            <ThemedText variant="heading" themeColor="textSecondary">bpm</ThemedText>
          </View>
          <ThemedText variant="bodyStrong" themeColor="success">Normal</ThemedText>
        </View>
        <View style={{ padding: spacing.md, borderRadius: radius.lg, backgroundColor: theme.backgroundElement, boxShadow: shadows.card }}>
          <ThemedText variant="heading">Tracking details coming soon</ThemedText>
          <ThemedText variant="body" themeColor="textSecondary" style={{ marginTop: spacing.xs }}>Your heart rate journal and trends will appear here.</ThemedText>
        </View>
      </View>
    </ScrollView>
  );
}
