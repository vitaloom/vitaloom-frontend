import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useTranslations } from '@/i18n';
import { getApiSessionGeneration } from '@/lib/api/http-client';
import { radius, shadows, sizing, spacing } from '@/theme';

import { assistantSettingsApi } from './assistant-course-api';
import { assistantSettingsMessages } from './assistant-settings-messages';

type SettingsStatus = 'loading' | 'ready' | 'saving' | 'error';

export function AssistantAccountSettings({ accountId }: { accountId: string }) {
  const theme = useTheme();
  const t = useTranslations(assistantSettingsMessages);
  const [status, setStatus] = useState<SettingsStatus>('loading');
  const [personalDataAllowed, setPersonalDataAllowed] = useState(false);
  const request = useRef<AbortController | null>(null);

  const loadSettings = useCallback(async (controller: AbortController, expectedAccountId: string) => {
    const session = getApiSessionGeneration();
    setStatus('loading');
    try {
      const settings = await assistantSettingsApi(session, controller.signal).get();
      if (request.current === controller && !controller.signal.aborted
        && expectedAccountId === accountId && session === getApiSessionGeneration()) {
        setPersonalDataAllowed(settings.personalDataAllowed);
        setStatus('ready');
        request.current = null;
      }
    } catch {
      if (request.current === controller && !controller.signal.aborted
        && expectedAccountId === accountId && session === getApiSessionGeneration()) {
        setStatus('error');
        request.current = null;
      }
    }
  }, [accountId]);

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    request.current = controller;
    void loadSettings(controller, accountId);
    return () => {
      request.current?.abort();
      request.current = null;
    };
  }, [accountId, loadSettings]));

  const saveSettings = async (nextAllowed: boolean) => {
    if (status !== 'ready' || request.current) return;
    const controller = new AbortController();
    const session = getApiSessionGeneration();
    request.current = controller;
    setStatus('saving');
    try {
      const settings = await assistantSettingsApi(session, controller.signal).update(nextAllowed);
      if (request.current === controller && !controller.signal.aborted
        && session === getApiSessionGeneration()) {
        setPersonalDataAllowed(settings.personalDataAllowed);
        setStatus('ready');
        request.current = null;
      }
    } catch {
      if (request.current === controller && !controller.signal.aborted
        && session === getApiSessionGeneration()) {
        setStatus('error');
        request.current = null;
      }
    }
  };

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
          value={personalDataAllowed}
          onValueChange={value => void saveSettings(value)}
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
              const controller = new AbortController();
              request.current?.abort();
              request.current = controller;
              void loadSettings(controller, accountId);
            }}
            style={{ minHeight: sizing.controlComfortable, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: spacing.xs }}>
            <ThemedText variant="labelStrong" themeColor="accent">{t('retry')}</ThemedText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
