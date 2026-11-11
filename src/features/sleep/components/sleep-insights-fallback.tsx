import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { spacing } from '@/theme';
import { SleepButton, SleepCard, SleepNotice, SleepWellnessHero } from './sleep-ui';
import type { InsightFallback } from '../utils/sleep-insights';

export function SleepInsightsFallback({ state, onRetry }: { state: InsightFallback; onRetry: () => void }) {
  const [expanded, setExpanded] = useState(false);
  if (state.kind === 'none') return null;
  if (state.kind === 'unavailable') return <SleepNotice
    title="Insights aren’t available for this view"
    message="We couldn’t verify an empty or insufficient-data state. Reload to check again."
    actionLabel="Reload insights"
    onAction={onRetry}
    error
  />;

  return <>
    <SleepWellnessHero large />
    {state.kind === 'no-data' ? <>
      <View style={styles.empty}>
        <ThemedText accessibilityRole="header" variant="heading" style={styles.center}>No sleep data yet</ThemedText>
        <ThemedText variant="subhead" themeColor="textSecondary" style={styles.center}>
          Record a session in this period to start exploring your patterns and feelings.
        </ThemedText>
      </View>
      <SleepButton label="Record Sleep" onPress={() => router.push('/sleep/record')} />
      <SleepButton label="Back to Sleep Home" variant="secondary" onPress={() => router.dismissTo('/sleep')} />
    </> : null}
    {state.kind === 'insufficient' ? <SleepCard>
        <ThemedText accessibilityRole="header" variant="heading">Not enough evidence yet</ThemedText>
        <ThemedText variant="subhead" themeColor="textSecondary">
          Keep recording sleep. Each insight becomes available when its evidence rules are met.
        </ThemedText>
        <SleepCard tone="mint">
          {(expanded ? state.requirements : state.requirements.slice(0, 2)).map((requirement) => <View key={requirement.title}>
            <ThemedText variant="labelStrong">{requirement.title}</ThemedText>
            <ThemedText variant="label" themeColor="textSecondary">{requirement.detail}</ThemedText>
          </View>)}
        </SleepCard>
        <SleepButton label="Continue Tracking" onPress={() => router.push('/sleep/record')} />
        {state.requirements.length > 2 ? <SleepButton label={expanded ? 'Show fewer requirements' : 'Show all requirements'}
          variant="quiet" onPress={() => setExpanded((value) => !value)} /> : null}
      </SleepCard> : null}
  </>;
}

const styles = StyleSheet.create({
  empty: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  center: { textAlign: 'center' },
});
