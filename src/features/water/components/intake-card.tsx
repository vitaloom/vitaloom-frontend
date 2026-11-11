import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { radius, shadows, sizing, spacing } from '@/theme';
import { useTranslations } from '@/i18n';
import { Icon } from './water-icon';
import type { Theme, WaterLog } from '../types/water';
import { waterMessages } from '../messages';


export function IntakeCard({ logs, theme, title, onSeeAll, limit, locale }: { logs: WaterLog[]; theme: Theme; title: string; onSeeAll?: () => void; limit?: number; locale?: string }) {
  const t = useTranslations(waterMessages);
  const shown = limit ? logs.slice(0, limit) : logs;
  return (
    <View style={{ padding: spacing.md, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card, gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <ThemedText variant="heading" style={{ flex: 1 }}>{title}</ThemedText>
        {onSeeAll ? <Pressable onPress={onSeeAll} accessibilityRole="button" accessibilityLabel={t('seeAllLabel')} hitSlop={8} style={({ pressed }) => ({ minHeight: sizing.controlMin, justifyContent: 'center', opacity: pressed ? 0.65 : 1 })}><ThemedText variant="labelStrong" themeColor="accent">{t('seeAll')}</ThemedText></Pressable> : null}
      </View>
      {shown.length === 0 ? <ThemedText variant="body" themeColor="textSecondary">{t('noLogs')}</ThemedText> : shown.map((log, index) => <View key={log.id} style={{ minHeight: sizing.controlComfortable, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: index === shown.length - 1 ? 0 : 1, borderBottomColor: theme.border }}>
        <View style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: theme.backgroundSelected }}><Icon name="waterOutline" color={theme.accent} /></View>
        <ThemedText variant="bodyStrong" style={{ flex: 1 }}>{t('amountMl', { amount: new Intl.NumberFormat(locale).format(log.amountMl) })}</ThemedText>
        <ThemedText variant="subhead" themeColor="textSecondary">{new Date(log.loggedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</ThemedText>
      </View>)}
    </View>
  );
}
