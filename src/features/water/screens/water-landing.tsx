import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { layout, spacing } from '@/theme';
import { Icon } from '../components/water-icon';
import { ProgressCard } from '../components/progress-card';
import { QuickAddCard } from '../components/quick-add-card';
import { IntakeCard } from '../components/intake-card';
import { initialIntake } from '../data/intake';

export default function WaterLandingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState(initialIntake);
  const total = useMemo(() => entries.reduce((sum, entry) => sum + entry.amount, 0), [entries]);

  function addIntake(amount: number) {
    const now = new Date();
    setEntries((current) => [{ id: now.getTime(), amount, time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }, ...current]);
  }

  return <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingTop: Math.max(insets.top + spacing.xs, spacing.lg), paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: spacing.md, alignItems: 'center' }}>
    <View style={{ width: '100%', maxWidth: layout.screenMax, gap: spacing.md }}>
      <View style={{ minHeight: layout.waterHeaderMin, justifyContent: 'center', gap: spacing.sm }}>
        <View accessibilityElementsHidden style={{ position: 'absolute', right: spacing.sm, top: spacing.sm }}><Icon name="calendar" color={theme.accent} /></View>
        <ThemedText variant="labelStrong" themeColor="accent" style={{ letterSpacing: 3 }}>WATER TRACKING</ThemedText>
        <ThemedText variant="largeTitle">Stay Hydrated</ThemedText>
        <ThemedText variant="body" themeColor="textSecondary" style={{ maxWidth: 280 }}>Good hydration keeps your body and mind in balance.</ThemedText>
      </View>
      <ProgressCard total={total} theme={theme} />
      <QuickAddCard onAdd={addIntake} theme={theme} />
      <IntakeCard entries={entries} theme={theme} />
    </View>
  </ScrollView>;
}
