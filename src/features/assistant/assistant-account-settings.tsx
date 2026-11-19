import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useTranslations } from '@/i18n';
import { radius, shadows, sizing, spacing } from '@/theme';

import { useAssistantAccess } from './assistant-access-provider';
import { assistantSettingsMessages } from './assistant-settings-messages';

export function AssistantAccountSettings({ accountId }: { accountId: string }) {
  const theme = useTheme();
  const t = useTranslations(assistantSettingsMessages);
  const { accountId: loadedAccountId, status: accessStatus, personalDataAllowed, refresh, update } = useAssistantAccess();
  const status = loadedAccountId === accountId ? accessStatus : 'loading';
  const currentAllowed = status === 'ready' && personalDataAllowed;

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  const panel = {
    backgroundColor: theme.backgroundElement,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    boxShadow: shadows.card,
  } as const;

  return (
    <View style={panel}>
      <ThemedText variant="labelStrong" style={{ marginBottom: spacing.xs }}>{t('title')}</ThemedText>
      <View style={{ minHeight: sizing.controlComfortable, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <ThemedText variant="body" style={{ flex: 1 }}>{t('permission')}</ThemedText>
        {status === 'loading' ? <ActivityIndicator color={theme.accent} accessibilityLabel={t('loading')} /> : null}
        <Switch
          accessibilityLabel={t('permission')}
          disabled={status !== 'ready'}
          value={currentAllowed}
          onValueChange={value => void update(value)}
        />
      </View>
      <ThemedText variant="caption" themeColor="textSecondary" style={{ marginTop: spacing.xs }}>
        {status === 'saving' ? t('saving') : t('explanation')}
      </ThemedText>
      {status === 'error' ? (
        <View style={{ marginTop: spacing.xs }} accessibilityLiveRegion="polite">
          <ThemedText variant="caption" themeColor="danger" accessibilityRole="alert">{t('error')}</ThemedText>
          <Pressable accessibilityRole="button"
            onPress={() => {
              void refresh();
            }}
            style={{ minHeight: sizing.controlComfortable, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: spacing.xs }}>
            <ThemedText variant="labelStrong" themeColor="accent">{t('retry')}</ThemedText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
