import type { ReactNode } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, ActivityIndicator, type ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';
import { HealthMetricsSidebar } from '@/components/ui/health-metrics-sidebar';
import { useTheme } from '@/hooks/use-theme';
import { radius, shadows, sizing, spacing } from '@/theme';
import { sleepArt } from '../assets/sleep-art';
import type { WriteResult } from '../types/sleep';

export function SleepPage({ title, subtitle, hero, wellness, wellnessHero, headerAction, footer, home, demo, fallback = '/sleep', children }: {
  title: string; subtitle?: string; hero?: boolean; home?: boolean; demo?: boolean; fallback?: Href; children: ReactNode;
  wellness?: boolean; wellnessHero?: boolean; headerAction?: ReactNode; footer?: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return <KeyboardAvoidingView style={[styles.canvas, { backgroundColor: theme.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    {wellness ? <LinearGradient pointerEvents="none" colors={[theme.stepsSoft, theme.backgroundSelected, theme.background]}
      style={styles.wellnessGradient} /> : null}
    <ScrollView style={styles.canvas} keyboardShouldPersistTaps="handled" contentContainerStyle={{
      paddingTop: insets.top + spacing.xs, paddingBottom: footer ? spacing.md : insets.bottom + spacing.lg, paddingHorizontal: spacing.md,
    }}>
      <View style={styles.content}>
        {home ? <HealthMetricsSidebar brandedHeader /> : null}
        <View style={[styles.header, hero && styles.hero]}>
          {hero ? <>
            <View pointerEvents="none" style={styles.wave} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Svg width="100%" height="100%" viewBox="0 0 480 100" preserveAspectRatio="none">
                <Path d="M0 79C95 36 130 100 229 65S363 1 480 16V100H0Z" fill={theme.accentSoft} opacity={0.7} />
                <Path d="M0 96C112 58 169 109 277 75S404 23 480 26V100H0Z" fill={theme.stepsSoft} />
              </Svg>
            </View>
            <Image accessible={false} source={sleepArt.moon} resizeMode="contain" style={styles.moon} />
          </> : null}
          {!home ? <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.canGoBack() ? router.back() : router.replace(fallback)}
            style={({ pressed }) => [styles.back, { backgroundColor: pressed ? theme.backgroundSelected : wellness ? theme.backgroundElement : 'transparent' }]}>
            <ThemedText variant="heading" themeColor="accent">‹</ThemedText>
          </Pressable> : null}
          <View style={[styles.title, hero && styles.heroTitle]}>
            <ThemedText accessibilityRole="header" variant={home ? 'largeTitle' : 'title'} style={wellness && styles.centerText}>{title}</ThemedText>
            {subtitle ? <ThemedText variant="subhead" themeColor="textSecondary" style={wellness && styles.centerText}>{subtitle}</ThemedText> : null}
            {demo ? <ThemedText variant="caption" themeColor="textSecondary">Demo sleep data</ThemedText> : null}
          </View>
          {headerAction ?? (wellness ? <View style={styles.headerSpacer} /> : null)}
        </View>
        {wellnessHero ? <SleepWellnessHero /> : null}
        {children}
      </View>
    </ScrollView>
    {footer ? <View style={[styles.footer, {
      backgroundColor: theme.background, borderTopColor: theme.border, paddingBottom: insets.bottom + spacing.sm,
    }]}>
      <View style={styles.content}>{footer}</View>
    </View> : null}
  </KeyboardAvoidingView>;
}

export function SleepWellnessHero({ large }: { large?: boolean }) {
  return <Image source={sleepArt.combinedHero} accessible={false} resizeMode="contain"
    style={[styles.wellnessArt, large && styles.wellnessArtLarge]} />;
}

export function SleepCard({ children, tone = 'default', onPress, label }: {
  children: ReactNode; tone?: 'default' | 'mint' | 'lilac' | 'warm'; onPress?: () => void; label?: string;
}) {
  const theme = useTheme();
  const surfaces = { default: theme.backgroundElement, mint: theme.stepsSoft, lilac: theme.sleepSoft, warm: theme.backgroundSelected };
  const style = [styles.card, { backgroundColor: surfaces[tone], borderColor: theme.border }];
  return onPress
    ? <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
        style={({ pressed }) => [...style, pressed && { backgroundColor: theme.backgroundSelected }]}>
        {children}
      </Pressable>
    : <View style={style}>{children}</View>;
}

export function SleepButton({ label, onPress, variant = 'primary', disabled, busy }: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'quiet' | 'danger'; disabled?: boolean; busy?: boolean;
}) {
  const theme = useTheme();
  const primary = variant === 'primary';
  const quiet = variant === 'quiet';
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }}
    disabled={disabled || busy} onPress={onPress}
    style={({ pressed }) => [styles.button, {
      backgroundColor: primary ? theme.accent : pressed && !quiet ? theme.backgroundSelected : 'transparent',
      borderColor: primary || quiet ? 'transparent' : theme.border,
      opacity: disabled ? 0.5 : pressed ? 0.78 : 1,
    }]}>
    {busy ? <ActivityIndicator color={primary ? theme.onAccent : theme.accent} /> : null}
    <ThemedText variant="bodyStrong" themeColor={primary ? 'onAccent' : variant === 'danger' ? 'danger' : 'accent'}>
      {label}
    </ThemedText>
  </Pressable>;
}

export function SleepNotice({ title, message, actionLabel, onAction, loading, error }: {
  title: string; message?: string; actionLabel?: string; onAction?: () => void; loading?: boolean; error?: boolean;
}) {
  const theme = useTheme();
  return <SleepCard>
    <View accessibilityLiveRegion="polite" accessibilityRole={error ? 'alert' : undefined} style={styles.noticeTitle}>
      {loading ? <ActivityIndicator color={theme.accent} /> : null}
      <ThemedText variant="bodyStrong" themeColor={error ? 'danger' : 'text'} style={styles.title}>{title}</ThemedText>
    </View>
    {message ? <ThemedText variant="subhead" themeColor="textSecondary">{message}</ThemedText> : null}
    {actionLabel && onAction ? <SleepButton label={actionLabel} onPress={onAction} variant="secondary" /> : null}
  </SleepCard>;
}

export function SleepWriteNotice({ result, reconcile, reload }: {
  result: WriteResult | null; reconcile: () => void; reload?: () => void;
}) {
  if (!result || result.kind === 'confirmed') return null;
  if (result.kind === 'unknown') return <SleepNotice title="Result not yet confirmed"
    message="Check the outcome before sending another change." actionLabel="Check result" onAction={reconcile} />;
  const conflict = result.kind === 'conflict' && result.reason !== 'overlap';
  return <SleepNotice title={conflict ? 'This item changed' : 'Check your changes'} message={result.message} error
    actionLabel={conflict && reload ? 'Reload confirmed data' : undefined} onAction={reload} />;
}

export function SleepSegments<T extends string>({ options, value, onChange }: {
  options: readonly { value: T; label: string; art?: ImageSourcePropType }[]; value: T; onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return <View style={[styles.segments, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
    {options.map((option) => {
      const selected = option.value === value;
      return <Pressable key={option.value} onPress={() => onChange(option.value)} accessibilityRole="button" accessibilityLabel={option.label}
        accessibilityState={{ selected }} style={({ pressed }) => [styles.segment, {
          backgroundColor: selected ? theme.accent : pressed ? theme.backgroundSelected : 'transparent',
        }]}>
        {option.art ? <Image source={option.art} accessible={false} resizeMode="contain" style={styles.segmentArt} /> : null}
        <ThemedText variant="labelStrong" themeColor={selected ? 'onAccent' : 'text'} style={styles.centerText}>
          {option.label}
        </ThemedText>
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  canvas: { flex: 1 },
  wellnessGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, paddingHorizontal: spacing.md },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: sizing.controlComfortable, gap: spacing.sm },
  hero: { minHeight: 110, paddingVertical: spacing.md },
  wave: { position: 'absolute', width: '100%', height: '85%', bottom: 0, borderRadius: radius.lg, overflow: 'hidden' },
  moon: { position: 'absolute', right: 0, top: -spacing.md, width: '37%', height: '120%', maxWidth: 170 },
  wellnessArt: { alignSelf: 'center', width: '100%', height: 148 },
  wellnessArtLarge: { height: 200 },
  headerSpacer: { width: sizing.controlComfortable },
  title: { flex: 1, gap: spacing.xs },
  heroTitle: { paddingRight: '19%', paddingLeft: spacing.xs },
  back: { width: sizing.controlComfortable, height: sizing.controlComfortable, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  card: { borderWidth: 1, borderRadius: radius.xl, borderCurve: 'continuous', padding: spacing.md, gap: spacing.sm, boxShadow: shadows.card },
  button: { flexDirection: 'row', minHeight: sizing.controlComfortable, alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderRadius: radius.full },
  noticeTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  segments: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, borderWidth: 1, borderRadius: radius.xl, padding: spacing.xs },
  segment: { flexGrow: 1, minHeight: sizing.controlComfortable, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    flexDirection: 'row', gap: spacing.xs,
    alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  segmentArt: { width: sizing.iconMd, height: sizing.iconMd },
  centerText: { textAlign: 'center' },
});
