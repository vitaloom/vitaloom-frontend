import { useState } from 'react';
import { Link, router, type Href } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '../store/auth-context';
import { ApiError } from '@/lib/api/http-client';
import { radius, shadows, sizing, spacing } from '@/theme';

export default function SignInScreen() {
  const theme = useTheme();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setBusy(true); setError('');
    try {
      await signIn(email, password);
      router.replace('/(tabs)/home');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to sign in. Try again.');
    } finally { setBusy(false); }
  }

  const inputStyle = { minHeight: sizing.controlComfortable, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundElement } as const;
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.lg }} keyboardShouldPersistTaps="handled">
      <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', gap: spacing.md }}>
        <ThemedText variant="largeTitle">Welcome back</ThemedText>
        <ThemedText themeColor="textSecondary">Sign in to continue to VitaLoom.</ThemedText>
        <TextInput accessibilityLabel="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Email" placeholderTextColor={theme.textSecondary} value={email} onChangeText={setEmail} style={inputStyle} />
        <TextInput accessibilityLabel="Password" autoCapitalize="none" autoComplete="password" secureTextEntry placeholder="Password" placeholderTextColor={theme.textSecondary} value={password} onChangeText={setPassword} style={inputStyle} />
        {error ? <ThemedText themeColor="danger" accessibilityRole="alert">{error}</ThemedText> : null}
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || !email || !password }} disabled={busy || !email || !password} onPress={() => void submit()} style={({ pressed }) => ({ minHeight: sizing.controlComfortable, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accent, opacity: busy || !email || !password ? 0.55 : pressed ? 0.8 : 1, boxShadow: shadows.card })}>
          <ThemedText variant="labelStrong" themeColor="onAccent">{busy ? 'Signing in…' : 'Sign in'}</ThemedText>
        </Pressable>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
          <ThemedText themeColor="textSecondary">New to VitaLoom?</ThemedText>
          <Link href={'/(auth)/register' as Href} asChild><Pressable><ThemedText themeColor="accent">Create account</ThemedText></Pressable></Link>
        </View>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}
