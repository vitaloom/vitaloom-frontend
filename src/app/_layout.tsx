import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import '@/global.css';
import { AuthProvider, useAuth } from '@/features/auth/store/auth-context';
import { AppearanceProvider, useAppearance } from '@/theme/appearance-provider';
import { colors } from '@/theme/colors';
import { StatusBar } from 'expo-status-bar';
import { I18nProvider, useTranslations } from '@/i18n';
import { sleepMessages } from '@/features/sleep/messages';

export default function RootLayout() {
  return <I18nProvider><AppearanceProvider><AuthProvider><ThemedNavigator /></AuthProvider></AppearanceProvider></I18nProvider>;
}

function ThemedNavigator() {
  const { scheme } = useAppearance();
  const themeColors = colors[scheme];
  const navigationTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...navigationTheme,
    colors: {
      ...navigationTheme.colors,
      primary: themeColors.accent,
      background: themeColors.background,
      card: themeColors.backgroundElement,
      text: themeColors.text,
      border: themeColors.border,
      notification: themeColors.danger,
    },
  };

  return <ThemeProvider value={theme}>
    <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    <AuthenticatedNavigator />
  </ThemeProvider>;
}

function AuthenticatedNavigator() {
  const { scheme } = useAppearance();
  const { status, pendingProfileInvitation } = useAuth();
  const t = useTranslations(sleepMessages);
  const themeColors = colors[scheme];
  const authenticated = status === 'authenticated';
  const authenticationScreenAvailable = status === 'unauthenticated' || status === 'temporarilyUnavailable';

  return <Stack screenOptions={{
    headerShown: false,
    contentStyle: { backgroundColor: themeColors.background },
    headerStyle: { backgroundColor: themeColors.backgroundElement },
    headerTintColor: themeColors.text,
    headerTitleStyle: { color: themeColors.text },
  }}>
    <Stack.Screen name="index" />
    <Stack.Protected guard={authenticated} redirectTo="/">
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="water" options={{ headerShown: false }} />
      <Stack.Screen name="sleep" options={{ headerShown: false, title: t('title') }} />
      <Stack.Screen name="steps" options={{ headerShown: false }} />
      <Stack.Screen name="heart-rate" options={{ headerShown: false }} />
      <Stack.Screen name="profile-edit" />
      <Stack.Screen name="profile-setup" />
      <Stack.Protected guard={pendingProfileInvitation} redirectTo="/(tabs)/home">
        <Stack.Screen name="profile-setup-prompt" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack.Protected>
    <Stack.Protected guard={authenticationScreenAvailable} redirectTo="/">
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    </Stack.Protected>
  </Stack>;
}
