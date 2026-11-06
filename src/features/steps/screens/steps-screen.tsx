import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { HealthMetricsSidebar } from '@/components/ui/health-metrics-sidebar';
import { useTheme } from '@/hooks/use-theme';
import { radius, shadows, sizing, spacing } from '@/theme';

export default function StepsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg, paddingHorizontal: spacing.md }}>
      <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', flex: 1, gap: spacing.lg }}>
        <HealthMetricsSidebar />
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Home" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={{ minHeight: sizing.controlMin, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: spacing.sm }}>
          <ThemedText variant="bodyStrong" themeColor="accent">‹  Home</ThemedText>
        </Pressable>
        <View style={{ gap: spacing.xs }}>
          <ThemedText variant="labelStrong" themeColor="accent">ACTIVITY</ThemedText>
          <ThemedText variant="largeTitle">Steps Tracking</ThemedText>
          <ThemedText variant="body" themeColor="textSecondary">Your daily movement at a glance.</ThemedText>
        </View>
        <View style={{ padding: spacing.lg, gap: spacing.sm, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card }}>
          <ThemedText variant="label" themeColor="textSecondary">TODAY</ThemedText>
          <ThemedText variant="display">7,842</ThemedText>
          <ThemedText variant="body" themeColor="textSecondary">of 10,000 steps · 78% of your goal</ThemedText>
          <View accessibilityRole="progressbar" accessibilityLabel="Steps goal progress" accessibilityValue={{ min: 0, max: 10000, now: 7842, text: '7,842 of 10,000 steps' }} style={{ height: 10, marginTop: spacing.sm, overflow: 'hidden', borderRadius: radius.full, backgroundColor: theme.accentSoft }}>
            <View style={{ width: '78.42%', height: '100%', borderRadius: radius.full, backgroundColor: theme.activity }} />
          </View>
        </View>
        <View style={{ padding: spacing.md, borderRadius: radius.lg, backgroundColor: theme.backgroundElement, boxShadow: shadows.card }}>
          <ThemedText variant="heading">Tracking details coming soon</ThemedText>
          <ThemedText variant="body" themeColor="textSecondary" style={{ marginTop: spacing.xs }}>Your steps journal and activity history will appear here.</ThemedText>
        </View>
      </View>
    </ScrollView>
  );
}
