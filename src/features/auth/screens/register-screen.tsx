import { useState } from 'react';
import { Link, router } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '../store/auth-context';
import type { RegisterResult } from '../types/auth';
import { ApiError } from '@/lib/api/http-client';
import { radius, shadows, sizing, spacing } from '@/theme';

export default function RegisterScreen() {
  const theme = useTheme();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [createdNeedsLogin, setCreatedNeedsLogin] = useState(false);

  async function submit() {
    setBusy(true); setError(''); setCreatedNeedsLogin(false);
    try {
      const result: RegisterResult = await register(email, password);
      if ('authStatus' in result) setCreatedNeedsLogin(true);
      else router.replace('/(tabs)/home');
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'EMAIL_ALREADY_REGISTERED') setError('An account with this email already exists. Sign in instead.');
      else setError(cause instanceof ApiError ? cause.message : 'Unable to create your account. Try again.');
    } finally { setBusy(false); }
  }

  const inputStyle = { minHeight: sizing.controlComfortable, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundElement } as const;
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.lg }} keyboardShouldPersistTaps="handled">
      <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', gap: spacing.md }}>
        <ThemedText variant="largeTitle">Create your account</ThemedText>
        <ThemedText themeColor="textSecondary">Use your email and a password with at least 8 characters.</ThemedText>
        <TextInput accessibilityLabel="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Email" placeholderTextColor={theme.textSecondary} value={email} onChangeText={setEmail} style={inputStyle} />
        <TextInput accessibilityLabel="Password" autoCapitalize="none" autoComplete="new-password" secureTextEntry placeholder="Password" placeholderTextColor={theme.textSecondary} value={password} onChangeText={setPassword} style={inputStyle} />
        {error ? <ThemedText themeColor="danger" accessibilityRole="alert">{error}</ThemedText> : null}
        {createdNeedsLogin ? <View style={{ gap: spacing.sm }}><ThemedText accessibilityRole="alert">Your account was created. Please sign in to continue.</ThemedText><Link href="/(auth)/sign-in" asChild><Pressable><ThemedText themeColor="accent">Go to sign in</ThemedText></Pressable></Link></View> : null}
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || !email || password.length < 8 }} disabled={busy || !email || password.length < 8} onPress={() => void submit()} style={({ pressed }) => ({ minHeight: sizing.controlComfortable, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accent, opacity: busy || !email || password.length < 8 ? 0.55 : pressed ? 0.8 : 1, boxShadow: shadows.card })}>
          <ThemedText variant="labelStrong" themeColor="onAccent">{busy ? 'Creating account…' : 'Create account'}</ThemedText>
        </Pressable>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
          <ThemedText themeColor="textSecondary">Already have an account?</ThemedText>
          <Link href="/(auth)/sign-in" asChild><Pressable><ThemedText themeColor="accent">Sign in</ThemedText></Pressable></Link>
        </View>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}
