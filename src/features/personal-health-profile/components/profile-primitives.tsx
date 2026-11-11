import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useAppearance } from '@/theme/appearance-provider';
import { radius, sizing, spacing } from '@/theme';

const heroImage = require('../assets/profile-hero-photorealistic.png');

export function ProfileHero({ title, subtitle, eyebrow, step, compact = false }: {
  title: string;
  subtitle: string;
  eyebrow: string;
  step?: 1 | 2;
  compact?: boolean;
}) {
  const theme = useTheme();
  const { scheme } = useAppearance();
  const dark = scheme === 'dark';
  const { fontScale } = useWindowDimensions();
  const separateArtwork = fontScale > 1.35;
  return (
    <View style={{
      minHeight: compact ? 148 : 178,
      marginBottom: spacing.md,
      borderRadius: radius.xl,
      overflow: 'hidden',
      backgroundColor: theme.accentSoft,
      justifyContent: 'center',
    }}>
      <Image
        source={heroImage}
        contentFit="cover"
        contentPosition={{ right: 0, top: 0 }}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={separateArtwork
          ? { width: '100%', height: 128 }
          : { position: 'absolute', width: '100%', height: '100%' }}
      />
      {!separateArtwork ? <LinearGradient
        colors={dark ? ['rgba(16,37,39,0.98)', 'rgba(16,37,39,0.9)', 'rgba(16,37,39,0.4)', 'rgba(16,37,39,0)'] : ['rgba(232,248,240,0.98)', 'rgba(232,248,240,0.92)', 'rgba(232,248,240,0.47)', 'rgba(232,248,240,0)']}
        locations={[0, 0.48, 0.72, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', inset: 0 }}
        pointerEvents="none"
      /> : null}
      <View style={{ padding: spacing.md, maxWidth: separateArtwork ? '100%' : '68%', gap: spacing.xs }}>
        <ThemedText variant="caption" themeColor="accent" style={{ fontWeight: '800', letterSpacing: 1 }}>
          {eyebrow.toUpperCase()}
        </ThemedText>
        <ThemedText accessibilityRole="header" variant={compact ? 'heading' : 'title'} style={{ fontWeight: '800' }}>
          {title}
        </ThemedText>
        <ThemedText variant="subhead" themeColor="textSecondary">{subtitle}</ThemedText>
        {step ? (
          <View accessibilityLabel={eyebrow} style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
            {[1, 2].map((number) => (
              <View key={number} style={{ width: 26, height: 4, borderRadius: radius.full, backgroundColor: number <= step ? theme.accent : theme.border }} />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function ProfileButton({ label, onPress, secondary = false, disabled = false, accessibilityHint }: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: sizing.controlComfortable,
        borderRadius: radius.lg,
        paddingHorizontal: spacing.lg,
        borderWidth: secondary ? 1 : 0,
        borderColor: theme.accent,
        backgroundColor: secondary ? 'transparent' : theme.accent,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      })}
    >
      <ThemedText variant="labelStrong" themeColor={secondary ? 'accent' : 'onAccent'} style={{ textAlign: 'center' }}>{label}</ThemedText>
    </Pressable>
  );
}
