import { useEffect } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/features/auth/store/auth-context';
import { spacing } from '@/theme';
import { useTranslations } from '@/i18n';
import { authMessages } from '@/features/auth/messages';

export default function IndexRoute() {
  const { status, pendingProfileInvitation, retryRestore, signOut } = useAuth();
  const theme = useTheme();
  const t = useTranslations(authMessages);

  useEffect(() => {
    if (status === 'authenticated') router.replace(pendingProfileInvitation ? '/profile-setup-prompt' : '/(tabs)/home');
    if (status === 'unauthenticated') router.replace('/(auth)/welcome');
  }, [status, pendingProfileInvitation]);

  if (status !== 'temporarilyUnavailable') return <View accessibilityRole="progressbar" accessibilityLabel={t('restoreLoading')} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}><ActivityIndicator color={theme.accent} /></View>;

  return <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md, backgroundColor: theme.background }}>
    <ThemedText variant="heading">{t('restoreFailed')}</ThemedText>
    <ThemedText themeColor="textSecondary">{t('restoreHelp')}</ThemedText>
    <Pressable accessibilityRole="button" accessibilityLabel={t('tryAgain')} onPress={() => void retryRestore()}><ThemedText themeColor="accent">{t('tryAgain')}</ThemedText></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={t('signIn')} onPress={() => { void signOut().finally(() => router.replace('/(auth)/sign-in')); }}><ThemedText themeColor="accent">{t('signIn')}</ThemedText></Pressable>
  </View>;
}
