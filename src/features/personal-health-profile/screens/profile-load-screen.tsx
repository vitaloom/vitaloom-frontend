import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, sizing, spacing } from '@/theme';

import { ProfileButton } from '../components/profile-primitives';

export function ProfileLoadScreen({ kind, onRetry, onBack, withTabs = false, onSignOut }: {
  kind: 'loading' | 'network-error' | 'unauthorized';
  onRetry: () => void;
  onBack: () => void;
  withTabs?: boolean;
  onSignOut?: () => void;
}) {
  const theme = useTheme();
  const loading = kind === 'loading';
  const unauthorized = kind === 'unauthorized';

  return (
    <SafeAreaView testID={kind === 'network-error' ? 'PHP-SCR-009' : undefined} edges={withTabs ? ['top', 'left', 'right'] : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing.md, paddingBottom: spacing.lg, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
        <View style={{ minHeight: sizing.controlComfortable, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} style={{ minWidth: sizing.controlMin, minHeight: sizing.controlMin, justifyContent: 'center' }}>
            <ThemedText variant="heading">‹</ThemedText>
          </Pressable>
          <ThemedText variant="bodyStrong" style={{ flexShrink: 1, textAlign: 'center' }}>Personal profile</ThemedText>
          <View style={{ width: sizing.controlMin }} />
        </View>
        <View style={{ flexGrow: 1, width: '100%', maxWidth: 380, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg, gap: spacing.md }}>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 144, height: 144, borderRadius: radius.full, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border, backgroundColor: theme.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            {loading ? <ActivityIndicator size="large" color={theme.accent} /> : unauthorized ? (
              <ThemedText variant="display" themeColor="warning">!</ThemedText>
            ) : (
              <Svg width={72} height={72} viewBox="0 0 24 24" aria-hidden>
                <Path d="M4 4l16 16M16 17H6a4 4 0 0 1-1-8M8 6a6 6 0 0 1 11 4 4 4 0 0 1 1 7" fill="none" stroke={theme.accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            )}
          </View>
          {!loading ? (
            <ThemedText variant="caption" themeColor="accent" style={{ fontWeight: '800', letterSpacing: 1 }}>
              {unauthorized ? 'SESSION CHECK' : 'CONNECTION ISSUE'}
            </ThemedText>
          ) : null}
          <ThemedText accessibilityRole="header" accessibilityLiveRegion="polite" variant="title" style={{ textAlign: 'center' }}>
            {loading ? 'Checking your profile' : unauthorized ? 'Sign in to view your profile' : 'We couldn’t load your profile'}
          </ThemedText>
          <ThemedText variant="subhead" themeColor="textSecondary" style={{ textAlign: 'center' }}>
            {loading ? 'We’re checking the latest saved details.' : unauthorized ? 'Your session needs attention before we can show current details.' : 'Your current details couldn’t be verified. Try again when your connection improves.'}
          </ThemedText>
          {!loading ? <View style={{ width: '100%', marginTop: spacing.sm }}><ProfileButton label={unauthorized ? 'Check session' : 'Try again'} onPress={onRetry} /></View> : null}
          {onSignOut ? <ProfileButton label="Sign out" onPress={onSignOut} secondary /> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
