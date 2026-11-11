import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useAppearance, type AppearancePreference } from '@/theme/appearance-provider';
import { radius, sizing, spacing } from '@/theme';
import { useI18n, useTranslations } from '@/i18n';

import { profileMessages } from '../profile-messages';

export function AppearanceSettings() {
  const theme = useTheme();
  const { preference, setPreference } = useAppearance();
  const { language, setLanguage } = useI18n();
  const t = useTranslations(profileMessages);
  const [saveFailed, setSaveFailed] = useState(false);
  const [languageSaveFailed, setLanguageSaveFailed] = useState(false);
  const requestId = useRef(0);
  const languageRequestId = useRef(0);

  return (
    <View style={{ backgroundColor: theme.backgroundElement, borderColor: theme.border, borderWidth: 1, borderRadius: radius.xl, padding: spacing.md, gap: spacing.sm }}>
      <ThemedText variant="labelStrong">{t('Appearance')}</ThemedText>
      <ThemedText variant="caption" themeColor="textSecondary">{t('Choose how VitaLoom looks on this device.')}</ThemedText>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: spacing.xs }}>
        {(['system', 'light', 'dark'] as const).map((choice) => (
          <AppearanceChoice
            key={choice}
            choice={choice}
            selected={preference === choice}
            onSelect={() => {
              const currentRequest = ++requestId.current;
              setSaveFailed(false);
              void setPreference(choice).then((saved) => {
                if (!saved && requestId.current === currentRequest) setSaveFailed(true);
              });
            }}
          />
        ))}
      </View>
      {saveFailed ? <ThemedText accessibilityRole="alert" accessibilityLiveRegion="polite" variant="caption" themeColor="danger">{t('Your appearance choice could not be saved. It will stay active until you close the app.')}</ThemedText> : null}
      <View style={{ height: 1, backgroundColor: theme.border, marginVertical: spacing.xs }} />
      <ThemedText variant="labelStrong">{t('Language')}</ThemedText>
      <ThemedText variant="caption" themeColor="textSecondary">{t('Choose the language used in VitaLoom.')}</ThemedText>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: spacing.xs }}>
        {(['vi', 'en'] as const).map((choice) => {
          const selected = language === choice;
          const label = choice === 'vi' ? 'Tiếng Việt' : 'English';
          return <Pressable key={choice} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: selected, selected }} onPress={() => {
            const currentRequest = ++languageRequestId.current;
            setLanguageSaveFailed(false);
            void setLanguage(choice).then((saved) => {
              if (!saved && languageRequestId.current === currentRequest) setLanguageSaveFailed(true);
            });
          }} style={({ pressed }) => ({ flex: 1, minHeight: sizing.controlComfortable, borderRadius: radius.md, borderWidth: 1, borderColor: selected ? theme.accent : theme.border, backgroundColor: selected ? theme.accent : theme.background, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.78 : 1 })}>
            <ThemedText variant="labelStrong" style={{ color: selected ? theme.onAccent : theme.text }}>{label}</ThemedText>
          </Pressable>;
        })}
      </View>
      {languageSaveFailed ? <ThemedText accessibilityRole="alert" accessibilityLiveRegion="polite" variant="caption" themeColor="danger">{t('Your language choice could not be saved. It will stay active until you close the app.')}</ThemedText> : null}
    </View>
  );
}

function AppearanceChoice({ choice, selected, onSelect }: { choice: AppearancePreference; selected: boolean; onSelect: () => void }) {
  const theme = useTheme();
  const t = useTranslations(profileMessages);
  const label = choice === 'system' ? t('System') : choice === 'light' ? t('Light') : t('Dark');
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, selected }}
      onPress={onSelect}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: sizing.controlComfortable,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: selected ? theme.accent : theme.border,
        backgroundColor: selected ? theme.accent : theme.background,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.78 : 1,
      })}>
      <ThemedText variant="labelStrong" style={{ color: selected ? theme.onAccent : theme.text }}>{label}</ThemedText>
    </Pressable>
  );
}
