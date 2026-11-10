import { Stack } from 'expo-router';
import '@/global.css';
import { AuthProvider, useAuth } from '@/features/auth/store/auth-context';

export default function RootLayout() {
  return <AuthProvider><AuthenticatedNavigator /></AuthProvider>;
}

function AuthenticatedNavigator() {
  const { status, pendingProfileInvitation } = useAuth();
  const authenticated = status === 'authenticated';
  const authenticationScreenAvailable = status === 'unauthenticated' || status === 'temporarilyUnavailable';

  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="index" />
    <Stack.Protected guard={authenticated} redirectTo="/">
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="water" options={{ headerShown: false }} />
      <Stack.Screen name="sleep" options={{ headerShown: true, title: 'Sleep Tracking' }} />
      <Stack.Screen name="steps" options={{ headerShown: false }} />
      <Stack.Screen name="heart-rate" options={{ headerShown: false }} />
      <Stack.Protected guard={pendingProfileInvitation} redirectTo="/(tabs)/home">
        <Stack.Screen name="profile-setup-prompt" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack.Protected>
    <Stack.Protected guard={authenticationScreenAvailable} redirectTo="/">
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    </Stack.Protected>
  </Stack>;
}
