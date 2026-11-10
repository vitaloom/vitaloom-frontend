import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ApiError } from '@/lib/api/http-client';
import { spacing } from '@/theme';
import { useAuth } from '../store/auth-context';
import { authErrorMessage, type AuthFormErrors, type AuthFormMode, validateCredentials } from '../lib/auth-form';
import { AuthFormField } from './auth-form-field';
import { AuthPrimaryButton } from './auth-primary-button';

export function AuthCredentialsForm({ mode }: { mode: AuthFormMode }) {
  const { signIn, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [apiError, setApiError] = useState('');
  const [createdNeedsLogin, setCreatedNeedsLogin] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  async function submit() {
    if (busyRef.current) return;
    const nextErrors = validateCredentials(email, password, mode);
    setErrors(nextErrors);
    if (nextErrors.email) { emailRef.current?.focus(); return; }
    if (nextErrors.password) { passwordRef.current?.focus(); return; }
    busyRef.current = true;
    setBusy(true);
    setApiError('');
    try {
      if (mode === 'sign-in') {
        await signIn(email, password);
        router.replace('/(tabs)/home');
      } else {
        const result = await register(email, password);
        if ('authStatus' in result) {
          setCreatedNeedsLogin(true);
          setApiError('Your account was created. Please sign in to continue.');
        } else router.replace('/profile-setup-prompt');
      }
    } catch (cause) {
      setApiError(cause instanceof ApiError ? authErrorMessage(mode, cause.status, cause.code) : authErrorMessage(mode, -1, 'UNKNOWN'));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const switchHref = mode === 'sign-in' ? '/(auth)/register' : '/(auth)/sign-in';
  return <View style={{ gap: spacing.md }}>
    <AuthFormField label="Email" value={email} onChangeText={(value) => { setEmail(value); setErrors((current) => ({ ...current, email: undefined })); }} error={errors.email} inputRef={emailRef} onSubmitEditing={() => passwordRef.current?.focus()} returnKeyType="next" />
    <AuthFormField label="Password" value={password} onChangeText={(value) => { setPassword(value); setErrors((current) => ({ ...current, password: undefined })); }} error={errors.password} inputRef={passwordRef} onSubmitEditing={() => void submit()} returnKeyType="done" newPassword={mode === 'register'} />
    {mode === 'register' && !errors.password ? <ThemedText variant="subhead" themeColor="textSecondary">Password must be at least 8 characters.</ThemedText> : null}
    {apiError ? <ThemedText themeColor="danger" accessibilityRole="alert">{apiError}</ThemedText> : null}
    <AuthPrimaryButton label={createdNeedsLogin ? 'Go to Sign In' : mode === 'sign-in' ? 'Sign In' : 'Create Account'} busy={busy} onPress={createdNeedsLogin ? () => router.replace('/(auth)/sign-in') : () => void submit()} />
    <Pressable accessibilityRole="button" onPress={() => router.replace(switchHref)} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><ThemedText themeColor="accent" variant="bodyStrong">{mode === 'sign-in' ? 'Create account' : 'Already have an account? Sign in'}</ThemedText></Pressable>
  </View>;
}
