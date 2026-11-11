import { Image, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme';
import { sleepArt } from '../assets/sleep-art';
import { SleepCard } from './sleep-ui';
import type { Insight } from '../types/sleep';
import { insightHref } from '../utils/sleep-navigation';

export function SleepInsightCard({ insight }: { insight: Insight }) {
  const theme = useTheme();
  const badge = insight.category === 'patterns' ? theme.stepsSoft : insight.category === 'feelings' ? theme.sleepSoft : theme.backgroundSelected;
  const illustration = insight.category === 'patterns' ? sleepArt.trend : insight.category === 'feelings' ? sleepArt.bars : sleepArt.pillow;
  return <SleepCard onPress={() => router.push(insightHref(insight))} label={`${insight.title}. ${insight.summary}`}>
    <View style={[styles.badge, { backgroundColor: badge }]}>
      <ThemedText variant="labelStrong">{insight.key.code}  {insight.title}</ThemedText>
    </View>
    <View style={styles.row}>
      <Image source={illustration} accessible={false} resizeMode="contain" style={styles.icon} />
      <ThemedText variant="subhead" style={styles.summary}>{insight.summary}</ThemedText>
      <ThemedText variant="heading" themeColor="accent" accessible={false}>›</ThemedText>
    </View>
  </SleepCard>;
}

const styles = StyleSheet.create({
  badge: { borderRadius: radius.md, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, alignSelf: 'flex-start', maxWidth: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { width: 50, height: 50 },
  summary: { flex: 1 },
});
