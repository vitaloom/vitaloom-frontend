import { Pressable, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/features/auth/store/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { radius, sizing, spacing } from '@/theme';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const theme = useTheme();
  return <ThemedView style={{ flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md }}>
    <ThemedText variant="largeTitle">Profile</ThemedText>
    <ThemedText themeColor="textSecondary">{user?.email}</ThemedText>
    <View style={{ alignItems: 'flex-start' }}><Pressable accessibilityRole="button" onPress={() => void signOut()} style={{ minHeight: sizing.controlComfortable, borderRadius: radius.lg, backgroundColor: theme.accent, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' }}><ThemedText themeColor="onAccent" variant="labelStrong">Sign out</ThemedText></Pressable></View>
  </ThemedView>;
}
