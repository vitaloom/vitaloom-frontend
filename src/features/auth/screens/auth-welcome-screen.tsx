import { useCallback, useState } from 'react';
import { BackHandler, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { spacing } from '@/theme';
import { AuthBottomSheet } from '../components/auth-bottom-sheet';
import { AuthCredentialsForm } from '../components/auth-credentials-form';
import { AuthHero } from '../components/auth-hero';
import { AuthPrimaryButton } from '../components/auth-primary-button';
import type { AuthFormMode } from '../lib/auth-form';
import { useTranslations } from '@/i18n';
import { authMessages } from '../messages';

export default function AuthWelcomeScreen({ mode: initialMode }: { mode?: AuthFormMode }) {
  const [mode, setMode] = useState(initialMode);
  const theme = useTheme();
  const t = useTranslations(authMessages);

  const closeForm = useCallback(() => {
    Keyboard.dismiss();
    if (initialMode) {
      router.replace('/(auth)/welcome');
    } else {
      setMode(undefined);
    }
  }, [initialMode]);

  function changeForm(nextMode: AuthFormMode) {
    Keyboard.dismiss();
    setMode(nextMode);
  }

  useFocusEffect(useCallback(() => {
    if (!mode) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      closeForm();
      return true;
    });
    return () => listener.remove();
  }, [closeForm, mode]));

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.scene, { backgroundColor: theme.background }]}>
        <AuthHero />
        {/* Keep the welcome panel's space so opening a form does not resize the hero. */}
        <AuthBottomSheet hidden={!!mode} title={t('welcomeTitle')}>
          <ThemedText themeColor="textSecondary" style={{ textAlign: 'center', marginBottom: spacing.md }}>
            {t('welcomeDescription')}
          </ThemedText>
          <View style={{ gap: spacing.md }}>
            <AuthPrimaryButton label={t('signIn')} disabled={!!mode} onPress={() => setMode('sign-in')} />
            <AuthPrimaryButton label={t('createAccount')} disabled={!!mode} outline onPress={() => setMode('register')} />
            {/* {__DEV__ && <AuthPrimaryButton label={t('restartOnboarding')} disabled={!!mode} outline onPress={() => router.replace('/onboarding')} />} */}
          </View>
        </AuthBottomSheet>
        {mode && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            pointerEvents="box-none"
            style={[StyleSheet.absoluteFill, styles.formLayer]}>
            <AuthBottomSheet title={mode === 'sign-in' ? t('signIn') : t('createAccount')} onClose={closeForm}>
              <AuthCredentialsForm key={mode} mode={mode} onChangeMode={changeForm} />
            </AuthBottomSheet>
          </KeyboardAvoidingView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scene: { flex: 1, overflow: 'hidden' },
  formLayer: { justifyContent: 'flex-end' },
});
