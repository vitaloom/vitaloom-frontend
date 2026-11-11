import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { HealthMetricsSidebar } from '@/components/ui/health-metrics-sidebar';
import { useTheme } from '@/hooks/use-theme';
import { useTranslations } from '@/i18n';
import { radius, shadows, spacing } from '@/theme';
import { sleepMessages } from '../messages';

export default function SleepScreen() {
  const theme = useTheme();
  const t = useTranslations(sleepMessages);
  const insets = useSafeAreaInsets();
  return <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.lg, paddingHorizontal: spacing.md }}>
    <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', gap: spacing.lg }}>
      <HealthMetricsSidebar />
      <View style={{ gap: spacing.xs }}>
        <ThemedText variant="labelStrong" themeColor="sleep">{t('eyebrow')}</ThemedText>
        <ThemedText variant="largeTitle">{t('title')}</ThemedText>
        <ThemedText variant="body" themeColor="textSecondary">{t('subtitle')}</ThemedText>
      </View>
      <View style={{ padding: spacing.lg, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card, gap: spacing.sm }}>
        <ThemedText variant="label" themeColor="textSecondary">{t('lastNight')}</ThemedText>
        <ThemedText variant="display">{t('duration')}</ThemedText>
        <ThemedText variant="body" themeColor="textSecondary">{t('goal')}</ThemedText>
      </View>
      <View style={{ padding: spacing.md, borderRadius: radius.lg, backgroundColor: theme.backgroundElement, boxShadow: shadows.card, gap: spacing.xs }}>
        <ThemedText variant="heading">{t('comingSoon')}</ThemedText>
        <ThemedText variant="body" themeColor="textSecondary">{t('journal')}</ThemedText>
      </View>
    </View>
  </ScrollView>;
}
