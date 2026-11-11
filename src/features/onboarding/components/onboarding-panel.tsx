import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import { radius, sizing, spacing, typography } from '@/theme';
import { onboardingSlides } from '../data/onboarding-slides';
import { useTranslations } from '@/i18n';
import { onboardingMessages } from '../messages';

const titleKeys = ['page1Title', 'page2Title', 'page3Title', 'page4Title'] as const;
const descriptionKeys = ['page1Description', 'page2Description', 'page3Description', 'page4Description'] as const;

type Props = {
  page: number;
  bottomInset: number;
  onAdvance: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
};

export function OnboardingPanel({ page, bottomInset, onAdvance, onLayout }: Props) {
  const theme = useTheme();
  const t = useTranslations(onboardingMessages);
  const slide = onboardingSlides[page];
  const title = t(titleKeys[page]);
  const description = t(descriptionKeys[page]);
  const finalPage = page === onboardingSlides.length - 1;
  const action = finalPage ? t('getStarted') : t('next');
  const copyOrder = [slide, ...onboardingSlides.filter(({ id }) => id !== slide.id)];

  return (
    <View onLayout={onLayout} style={[styles.panel, { backgroundColor: theme.backgroundElement, paddingBottom: spacing.lg + bottomInset }]}>
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
                accessibilityLabel={active ? t('pageAnnouncement', { page: page + 1, total: onboardingSlides.length, title }) : undefined}
              style={[styles.title, { color: theme.text }, item.showsBrand && styles.welcomeTitle]}>
                {active ? title : t(titleKeys[onboardingSlides.indexOf(item)])}
              </Text>
              <Text style={[styles.description, { color: theme.textSecondary }]}>{active ? description : t(descriptionKeys[onboardingSlides.indexOf(item)])}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.pagination} aria-hidden>
        {onboardingSlides.map(({ id }, index) => (
          <View key={id} style={[styles.dot, { backgroundColor: theme.border }, index === page && { backgroundColor: theme.accent }]} />
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action}
        accessibilityHint={finalPage ? t('finishHint') : t('nextHint')}
        onPress={onAdvance}
        style={({ pressed }) => [styles.action, { backgroundColor: theme.accent }, pressed && { backgroundColor: theme.focus }]}>
        <Text style={[styles.actionText, { color: theme.onAccent }]}>{action}</Text>
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
  title: { ...typography.title, textAlign: 'center' },
  welcomeTitle: { fontSize: typography.heading.fontSize },
  description: {
    ...typography.body,
    textAlign: 'center',
    alignSelf: 'center',
    // Match the reference copy measure and reserve space for three lines at the default size.
    maxWidth: 300,
    minHeight: typography.body.lineHeight * 3,
  },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm + spacing.half },
  dot: { width: spacing.sm + spacing.half, height: spacing.sm + spacing.half, borderRadius: radius.full },
  action: {
    minHeight: sizing.controlComfortable + spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionText: { ...typography.bodyStrong, textAlign: 'center', flexShrink: 1 },
});
