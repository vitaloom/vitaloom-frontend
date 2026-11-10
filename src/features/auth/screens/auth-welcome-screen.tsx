import { useEffect } from 'react';
import { BackHandler, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { spacing } from '@/theme';
import { AuthBottomSheet } from '../components/auth-bottom-sheet';
import { AuthCredentialsForm } from '../components/auth-credentials-form';
import { AuthHero } from '../components/auth-hero';
import { AuthPrimaryButton } from '../components/auth-primary-button';
import type { AuthFormMode } from '../lib/auth-form';

export default function AuthWelcomeScreen({ mode }: { mode?: AuthFormMode }) {
  const theme = useTheme();
  useEffect(() => {
    if (!mode) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { router.replace('/(auth)/welcome'); return true; });
    return () => listener.remove();
  }, [mode]);

  return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
    <AuthHero />
    {mode ? <AuthBottomSheet title={mode === 'sign-in' ? 'Sign In' : 'Create Account'} onClose={() => router.replace('/(auth)/welcome')}><AuthCredentialsForm key={mode} mode={mode} /></AuthBottomSheet> :
      <AuthBottomSheet title="Welcome to Healthy Check">
        <ThemedText themeColor="textSecondary" style={{ textAlign: 'center', marginBottom: spacing.md }}>Continue your wellness journey to build healthier habits and a happier you.</ThemedText>
        <View style={{ gap: spacing.md }}>
          <AuthPrimaryButton label="Sign In" onPress={() => router.push('/(auth)/sign-in')} />
          <AuthPrimaryButton label="Create Account" outline onPress={() => router.push('/(auth)/register')} />
          {__DEV__ && <AuthPrimaryButton label="Dev: Restart Onboarding" outline onPress={() => router.replace('/onboarding')} />}
        </View>
      </AuthBottomSheet>}
  </SafeAreaView>;
}
