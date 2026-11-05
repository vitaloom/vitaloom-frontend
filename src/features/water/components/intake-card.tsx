import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { radius, shadows, sizing, spacing } from '@/theme';
import { Icon } from './water-icon';
import type { Theme, WaterLog } from '../types/water';


export function IntakeCard({ logs, theme, title, onSeeAll, limit }: { logs: WaterLog[]; theme: Theme; title: string; onSeeAll?: () => void; limit?: number }) {
  const shown = limit ? logs.slice(0, limit) : logs;
  return (
    <View style={{ padding: spacing.md, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card, gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <ThemedText variant="heading" style={{ flex: 1 }}>{title}</ThemedText>
        {onSeeAll ? <Pressable onPress={onSeeAll} accessibilityRole="button" accessibilityLabel="See all water logs in progress" hitSlop={8} style={({ pressed }) => ({ minHeight: sizing.controlMin, justifyContent: 'center', opacity: pressed ? 0.65 : 1 })}><ThemedText variant="labelStrong" themeColor="accent">See All ›</ThemedText></Pressable> : null}
      </View>
      {shown.length === 0 ? <ThemedText variant="body" themeColor="textSecondary">No water logged for this day yet.</ThemedText> : shown.map((log, index) => <View key={log.id} style={{ minHeight: sizing.controlComfortable, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: index === shown.length - 1 ? 0 : 1, borderBottomColor: theme.border }}>
        <View style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: theme.backgroundSelected }}><Icon name="waterOutline" color={theme.accent} /></View>
        <ThemedText variant="bodyStrong" style={{ flex: 1 }}>{log.amountMl} ml</ThemedText>
        <ThemedText variant="subhead" themeColor="textSecondary">{new Date(log.loggedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</ThemedText>
      </View>)}
    </View>
  );
}
