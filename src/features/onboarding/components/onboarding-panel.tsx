import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radius, sizing, spacing, typography } from '@/theme';
import { onboardingSlides } from '../data/onboarding-slides';

const theme = colors.light;

type Props = {
  page: number;
  bottomInset: number;
  onAdvance: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
};

export function OnboardingPanel({ page, bottomInset, onAdvance, onLayout }: Props) {
  const slide = onboardingSlides[page];
  const finalPage = page === onboardingSlides.length - 1;
  const copyOrder = [slide, ...onboardingSlides.filter(({ id }) => id !== slide.id)];

  return (
    <View onLayout={onLayout} style={[styles.panel, { paddingBottom: spacing.lg + bottomInset }]}>
      <View style={styles.copyRow}>
        {/* Let the tallest copy size the row at the current width and text scale. */}
        {copyOrder.map((item) => {
          const active = item.id === slide.id;
          return (
            <View
              key={item.id}
              aria-hidden={!active}
              importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
              style={[styles.copy, !active && styles.hiddenCopy]}>
              <Text
                accessibilityRole={active ? 'header' : undefined}
                aria-live={active ? 'polite' : undefined}
                accessibilityLabel={active ? `Onboarding, page ${page + 1} of ${onboardingSlides.length}. ${item.title}` : undefined}
                style={[styles.title, item.showsBrand && styles.welcomeTitle]}>
                {item.title}
              </Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.pagination} aria-hidden>
        {onboardingSlides.map(({ id }, index) => (
          <View key={id} style={[styles.dot, index === page && styles.activeDot]} />
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={slide.action}
        accessibilityHint={finalPage ? 'Opens the authentication welcome screen' : 'Continues to the next onboarding page'}
        onPress={onAdvance}
        style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
        <Text style={styles.actionText}>{slide.action}</Text>
        <Svg width={sizing.iconMd} height={sizing.iconMd} viewBox="0 0 24 24" aria-hidden>
          <Path
            d="M4 12h15m-6-6 6 6-6 6"
            stroke={theme.onAccent}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: theme.backgroundElement,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderCurve: 'continuous',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  copyRow: { flexDirection: 'row', overflow: 'hidden' },
  copy: { width: '100%', flexShrink: 0, gap: spacing.sm },
  hiddenCopy: { opacity: 0 },
  title: { ...typography.title, color: theme.text, textAlign: 'center' },
  welcomeTitle: { fontSize: typography.heading.fontSize },
  description: {
    ...typography.body,
    color: theme.textSecondary,
    textAlign: 'center',
    alignSelf: 'center',
    // Match the reference copy measure and reserve space for three lines at the default size.
    maxWidth: 300,
    minHeight: typography.body.lineHeight * 3,
  },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm + spacing.half },
  dot: { width: spacing.sm + spacing.half, height: spacing.sm + spacing.half, borderRadius: radius.full, backgroundColor: theme.border },
  activeDot: { backgroundColor: theme.accent },
  action: {
    minHeight: sizing.controlComfortable + spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: theme.accent,
    borderRadius: radius.full,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionPressed: { backgroundColor: theme.text },
  actionText: { ...typography.bodyStrong, color: theme.onAccent, textAlign: 'center', flexShrink: 1 },
});
