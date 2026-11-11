import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { layout, motion, spacing } from '@/theme';
import { advanceOnboarding, type OnboardingPosition } from '../advance-onboarding';
import { OnboardingHero } from '../components/onboarding-hero';
import { OnboardingPanel } from '../components/onboarding-panel';
import { onboardingSlides } from '../data/onboarding-slides';
import { useTranslations } from '@/i18n';
import { onboardingMessages } from '../messages';

const titleKeys = ['page1Title', 'page2Title', 'page3Title', 'page4Title'] as const;

// The approved onboarding artwork has a warmer cream-to-mint wash than the shared calm gradient.
const panelOverlap = spacing.md;

export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const theme = useTheme();
  const t = useTranslations(onboardingMessages);
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [viewportHeight, setViewportHeight] = useState(window.height);
  const [panelHeight, setPanelHeight] = useState(0);
  const [page, setPage] = useState(0);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const position = useRef<OnboardingPosition>({ page: 0, lockedUntil: 0, completed: false });
  const slide = onboardingSlides[page];
  const title = t(titleKeys[page]);
  const width = Math.max(0, Math.min(layout.screenMax, window.width - insets.left - insets.right));

  // Anchor the shared panel above the bottom safe area. Keep some room for art
  // when large text needs more height, with vertical scrolling as a fallback.
  const minimumPanelTop = Math.max(viewportHeight * 0.4, insets.top + spacing.xxxl * window.fontScale);
  const panelTop = Math.max(minimumPanelTop, panelHeight ? viewportHeight - panelHeight : viewportHeight * 0.64);
  const stageHeight = panelTop + panelOverlap;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      AccessibilityInfo.announceForAccessibility(
        t('pageAnnouncement', { page: page + 1, total: onboardingSlides.length, title }),
      );
    }
  }, [page, title, t]);

  function handleAdvance() {
    const current = position.current;
    if (current.page !== page) return;
    const next = advanceOnboarding(
      current,
      performance.now(),
      onboardingSlides.length,
      motion.duration.transition,
    );
    if (next === current) return;
    position.current = next;

    if (next.completed) {
      onComplete();
    } else {
      scroll.current?.scrollTo({ y: 0, animated: false });
      setPage(next.page);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.background, paddingLeft: insets.left, paddingRight: insets.right }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scroll}
        onLayout={({ nativeEvent }) => setViewportHeight(nativeEvent.layout.height)}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}>
        <View style={[styles.flow, { width }]}>
          <LinearGradient colors={[theme.backgroundElement, theme.background]} style={[styles.gradient, { height: stageHeight + spacing.xl }]} />
          <OnboardingHero slide={slide} height={stageHeight} topInset={insets.top} />
          <View style={styles.panelOverlay}>
            <OnboardingPanel
              page={page}
              bottomInset={insets.bottom}
              onAdvance={handleAdvance}
              onLayout={({ nativeEvent }) => setPanelHeight(nativeEvent.layout.height)}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  flow: { flexGrow: 1 },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0 },
  panelOverlay: { marginTop: -panelOverlap },
});
