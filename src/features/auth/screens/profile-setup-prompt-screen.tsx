import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, shadows, sizing, spacing } from '@/theme';
import { useAuth } from '../store/auth-context';
import Svg, { Path } from 'react-native-svg';

const benefits = [
  'Personalise your daily goals',
  'Make your wellness tracking more useful',
  'Update your information anytime',
];

export default function ProfileSetupPromptScreen() {
  const theme = useTheme();
  const { dismissProfileInvitation } = useAuth();
  function finish(destination: '/(tabs)/profile' | '/(tabs)/home') {
    router.replace(destination);
    dismissProfileInvitation();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', maxWidth: 480, flex: 1, alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg }}>
          <View style={{ alignItems: 'center', gap: spacing.xs }}>
           <Svg
                         width={sizing.controlComfortable}
                         height={sizing.iconLg}
                         viewBox="0 0 48 32"
                         aria-hidden>
                         <Path
                           fill={theme.accent}
                           d="M24 27C10 29 2 17 2 3c13 0 24 7 24 20C29 12 36 7 46 6c0 14-6 23-20 23l-1 3h-2z"
                         />
                         <Path
                           d="M24 29c-2-7-6-12-11-17m11 17c3-6 7-11 12-15"
                           fill="none"
                           stroke={theme.backgroundElement}
                           strokeWidth={1.4}
                           strokeLinecap="round"
                         />
                       </Svg>
            <ThemedText variant="heading" style={{ color: theme.text, fontWeight: '800', letterSpacing: -0.5 }}>Healthy Check</ThemedText>
          </View>

          <ProfileIllustration />

          <View style={{ width: '100%', alignItems: 'center', gap: spacing.md }}>
            <ThemedText variant="largeTitle" style={{ textAlign: 'center', maxWidth: 360 }}>A healthier you starts here</ThemedText>
            <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>Make Healthy Check feel like yours.</ThemedText>
          </View>

          <View accessibilityLabel="Profile setup benefits" style={{ width: '100%', gap: spacing.md }}>
            {benefits.map((benefit) => (
              <View key={benefit} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View accessible={false} style={{ width: 32, height: 32, borderRadius: radius.full, backgroundColor: theme.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <ThemedText themeColor="accent" variant="labelStrong">✓</ThemedText>
                </View>
                <ThemedText style={{ flex: 1 }}>{benefit}</ThemedText>
              </View>
            ))}
          </View>

          <View style={{ width: '100%', gap: spacing.sm }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Set up my profile"
              onPress={() => finish('/(tabs)/profile')}
              style={({ pressed }) => ({ minHeight: sizing.controlComfortable + spacing.sm, borderRadius: radius.full, paddingHorizontal: spacing.lg, backgroundColor: theme.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, opacity: pressed ? 0.82 : 1, boxShadow: shadows.card })}
            >
              <ThemedText variant="labelStrong" themeColor="onAccent">Set up my profile</ThemedText>
              <ThemedText variant="labelStrong" themeColor="onAccent" accessible={false}>→</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => finish('/(tabs)/home')}
              style={({ pressed }) => ({ minHeight: sizing.controlComfortable + spacing.sm, borderRadius: radius.full, paddingHorizontal: spacing.lg, borderColor: theme.accent, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.72 : 1 })}
            >
              <ThemedText variant="labelStrong" themeColor="accent">Maybe later</ThemedText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileIllustration() {
  const theme = useTheme();

  return (
    <View accessible={false} style={{ width: '100%', height: 220, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accentSoft, borderRadius: radius.xl, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: radius.full, backgroundColor: theme.surfaceTint, top: -72, left: -30 }} />
      <View style={{ position: 'absolute', width: 130, height: 130, borderRadius: radius.full, backgroundColor: theme.background, bottom: -60, right: -18 }} />
      <View style={{ width: 178, height: 174, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, padding: spacing.md, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, boxShadow: shadows.floating }}>
        <View style={{ position: 'absolute', top: -7, width: 54, height: 20, borderRadius: radius.full, backgroundColor: theme.activity }} />
        <View style={{ width: 72, height: 72, borderRadius: radius.lg, backgroundColor: theme.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 26, height: 26, borderRadius: radius.full, backgroundColor: theme.activity, marginTop: 3 }} />
          <View style={{ width: 48, height: 19, borderTopLeftRadius: radius.full, borderTopRightRadius: radius.full, backgroundColor: theme.activity, marginTop: -2 }} />
        </View>
        <View style={{ width: '86%', height: 10, borderRadius: radius.full, backgroundColor: theme.accentSoft }} />
        <View style={{ width: '68%', height: 10, borderRadius: radius.full, backgroundColor: theme.accentSoft }} />
        <View style={{ width: 56, height: 14, borderRadius: radius.full, backgroundColor: theme.activity }} />
      </View>
      <View style={{ position: 'absolute', left: '12%', top: '55%', width: 58, height: 42, borderRadius: radius.lg, backgroundColor: theme.backgroundElement, alignItems: 'center', justifyContent: 'center', boxShadow: shadows.card }}>
        <ThemedText variant="heading" style={{ color: theme.water }}>♥</ThemedText>
      </View>
      <View style={{ position: 'absolute', right: '12%', top: '30%', width: 56, height: 56, borderRadius: radius.full, backgroundColor: theme.backgroundElement, alignItems: 'center', justifyContent: 'center', boxShadow: shadows.card }}>
        <View style={{ width: 19, height: 16, borderWidth: 3, borderColor: theme.activity, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', width: 11, height: 9, borderWidth: 2, borderColor: theme.activity, borderBottomWidth: 0, borderTopLeftRadius: 6, borderTopRightRadius: 6, top: -10 }} />
          <View style={{ width: 3, height: 3, borderRadius: radius.full, backgroundColor: theme.activity }} />
        </View>
      </View>
    </View>
  );
}
