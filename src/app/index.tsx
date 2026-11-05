import { useEffect } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/features/auth/store/auth-context';
import { spacing } from '@/theme';

export default function IndexRoute() {
  const { status, retryRestore, signOut } = useAuth();
  const theme = useTheme();

  useEffect(() => {
    if (status === 'authenticated') router.replace('/(tabs)/home');
    if (status === 'unauthenticated') router.replace('/(auth)/sign-in');
  }, [status]);

  if (status !== 'temporarilyUnavailable') return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}><ActivityIndicator color={theme.accent} /></View>;

  return <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md, backgroundColor: theme.background }}>
    <ThemedText variant="heading">Can’t restore your session</ThemedText>
    <ThemedText themeColor="textSecondary">Your saved sign-in is still available. Check your connection and try again.</ThemedText>
    <Pressable accessibilityRole="button" onPress={() => void retryRestore()}><ThemedText themeColor="accent">Try again</ThemedText></Pressable>
    <Pressable accessibilityRole="button" onPress={() => { void signOut().finally(() => router.replace('/(auth)/sign-in')); }}><ThemedText themeColor="accent">Sign in</ThemedText></Pressable>
  </View>;
}
