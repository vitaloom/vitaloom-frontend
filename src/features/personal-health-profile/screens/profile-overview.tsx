import { ScrollView, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { WellnessIcon } from '@/components/ui/wellness-icon';
import { useTheme } from '@/hooks/use-theme';
import { radius, shadows, sizing, spacing } from '@/theme';
import { useI18n, useTranslations, type TranslationValues } from '@/i18n';

import { ProfileButton, ProfileHero } from '../components/profile-primitives';
import { AppearanceSettings } from '../components/appearance-settings';
import { basicFields, fieldLabels, lifestyleFields, type ProfileField, type ProfileSnapshot } from '../types/profile';
import { formatProfileValue } from '../utils/profile-form';
import { profileMessages } from '../profile-messages';

type ProfileMessageKey = keyof typeof profileMessages.en;
type ProfileTranslator = (key: ProfileMessageKey, values?: TranslationValues) => string;

export function ProfileOverview({ snapshot, saved, onEdit, onBack, onSignOut }: {
  snapshot: ProfileSnapshot;
  saved: boolean;
  onEdit: () => void;
  onBack: () => void;
  onSignOut: () => void;
}) {
  const theme = useTheme();
  const { locale } = useI18n();
  const t = useTranslations(profileMessages);
  const hasValues = !!snapshot.profile && Object.keys(snapshot.profile.values).length > 0;

  return (
    <SafeAreaView testID={saved ? 'PHP-SCR-011' : hasValues ? 'PHP-SCR-004' : 'PHP-SCR-005'} edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.md, width: '100%', maxWidth: 560, alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('Go back')} onPress={onBack} hitSlop={8} style={{ minWidth: sizing.controlMin, minHeight: sizing.controlMin, alignItems: 'flex-start', justifyContent: 'center' }}>
            <ThemedText variant="heading">‹</ThemedText>
          </Pressable>
          <ThemedText accessibilityRole="header" variant="bodyStrong">{t('Personal profile')}</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel={t('Edit profile')} onPress={onEdit} hitSlop={8} style={{ minWidth: sizing.controlMin, minHeight: sizing.controlMin, alignItems: 'flex-end', justifyContent: 'center' }}>
            <WellnessIcon name="profile" size={22} color={theme.accent} />
          </Pressable>
        </View>

        {saved ? <StatusBanner text={t('Profile updated. Your changes have been saved.')} success /> : null}
        <ProfileHero
          compact
          eyebrow={t('Personal health profile')}
          title={t(hasValues ? 'Your wellness, your way.' : 'Your space, your pace.')}
          subtitle={t(hasValues ? 'A little context makes your wellness journey more personal.' : 'Add only the details that feel comfortable sharing.')}
        />
        <ProfileCard cardId="about" title={t('About you')} fields={basicFields} snapshot={snapshot} locale={locale} t={t} />
        <ProfileCard cardId="body" title={t('Body & lifestyle')} fields={lifestyleFields} snapshot={snapshot} locale={locale} t={t} />
        <AppearanceSettings />

        <View style={{ marginTop: 'auto', gap: spacing.sm }}>
          <ProfileButton label="Edit profile" onPress={onEdit} />
          <ThemedText variant="caption" themeColor="textSecondary" style={{ textAlign: 'center', marginBottom: spacing.sm }}>
            {t('Self-reported details · You control what you share')}
          </ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel={t('Sign out')} onPress={onSignOut} style={{ minHeight: sizing.controlMin, alignItems: 'center', justifyContent: 'center' }}>
            <ThemedText themeColor="textSecondary" variant="label">{t('Sign out')}</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileCard({ cardId, title, fields, snapshot, locale, t }: { cardId: 'about' | 'body'; title: string; fields: readonly ProfileField[]; snapshot: ProfileSnapshot; locale: string; t: ProfileTranslator }) {
  const theme = useTheme();
  const label = (field: ProfileField) => t(fieldLabels[field]);
  const genders = Object.fromEntries(['male', 'female', 'other', 'prefer_not_to_say'].map((key) => [key, t(({ male: 'Male', female: 'Female', other: 'Other', prefer_not_to_say: 'Prefer not to say' } as const)[key as 'male' | 'female' | 'other' | 'prefer_not_to_say'])]));
  const activityLevels = Object.fromEntries(['sedentary', 'lightly_active', 'moderately_active', 'very_active'].map((key) => [key, t(({ sedentary: 'Mostly seated', lightly_active: 'Lightly active', moderately_active: 'Moderately active', very_active: 'Very active' } as const)[key as 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active'])]));
  return (
    <View accessibilityLabel={title} style={{ backgroundColor: theme.backgroundElement, borderColor: theme.border, borderWidth: 1, borderRadius: radius.xl, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs, marginBottom: spacing.sm, boxShadow: shadows.card }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
        <View accessible={false} style={{ width: 34, height: 34, borderRadius: radius.md, backgroundColor: theme.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        <WellnessIcon name={cardId === 'about' ? 'profile' : 'statistics'} color={theme.accent} size={19} />
        </View>
        <ThemedText variant="labelStrong">{title}</ThemedText>
      </View>
      {fields.map((field) => {
        const value = formatProfileValue(field, snapshot.profile?.values ?? {}, locale, { notAdded: t('Not added'), genders, activityLevels });
        return (
          <View key={field} accessible accessibilityLabel={`${label(field)}, ${value}`} style={{ minHeight: sizing.controlMin, paddingVertical: spacing.xs, borderBottomColor: theme.background, borderBottomWidth: field === fields[fields.length - 1] ? 0 : 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
            <ThemedText variant="caption" themeColor="textSecondary" style={{ flex: 1 }}>{label(field)}</ThemedText>
            <ThemedText variant="labelStrong" themeColor={snapshot.profile?.values[field] === undefined ? 'textSecondary' : 'text'} style={{ flex: 1, textAlign: 'right' }}>{value}</ThemedText>
          </View>
        );
      })}
    </View>
  );
}

function StatusBanner({ text, success = false }: { text: string; success?: boolean }) {
  const theme = useTheme();
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ backgroundColor: success ? theme.accentSoft : theme.backgroundElement, borderRadius: radius.md, borderColor: theme.border, borderWidth: 1, padding: spacing.sm, marginBottom: spacing.sm }}>
      <ThemedText variant="label" themeColor={success ? 'success' : 'text'}>{text}</ThemedText>
    </View>
  );
}

export { StatusBanner };
