import { useEffect } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/features/auth/store/auth-context';
import { spacing } from '@/theme';
import { useTranslations } from '@/i18n';
import { authMessages } from '@/features/auth/messages';
import { useRetryCountdown } from '@/features/auth/lib/use-retry-countdown';

export default function IndexRoute() {
  const { status, pendingProfileInvitation, retryRestore, refreshRateLimit, signOut } = useAuth();
  const secondsLeft = useRetryCountdown(refreshRateLimit?.retryAt);
  const theme = useTheme();
  const t = useTranslations(authMessages);

  useEffect(() => {
    if (status === 'authenticated') router.replace(pendingProfileInvitation ? '/profile-setup-prompt' : '/(tabs)/home');
    if (status === 'unauthenticated') router.replace('/(auth)/welcome');
  }, [status, pendingProfileInvitation]);

  if (status !== 'temporarilyUnavailable') return <View accessibilityRole="progressbar" accessibilityLabel={t('restoreLoading')} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}><ActivityIndicator color={theme.accent} /></View>;

  return <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md, backgroundColor: theme.background }}>
    <ThemedText variant="heading">{t('restoreFailed')}</ThemedText>
    <ThemedText themeColor="textSecondary">{secondsLeft > 0
      ? t('restoreRetryCountdown', { seconds: secondsLeft })
      : t(refreshRateLimit ? 'restoreRateLimited' : 'restoreHelp')}</ThemedText>
    <Pressable accessibilityRole="button" accessibilityLabel={t('tryAgain')} accessibilityState={{ disabled: secondsLeft > 0 }} disabled={secondsLeft > 0} onPress={() => void retryRestore()}><ThemedText themeColor={secondsLeft > 0 ? 'textSecondary' : 'accent'}>{t('tryAgain')}</ThemedText></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={t('signIn')} onPress={() => { void signOut().finally(() => router.replace('/(auth)/sign-in')); }}><ThemedText themeColor="accent">{t('signIn')}</ThemedText></Pressable>
  </View>;
}
