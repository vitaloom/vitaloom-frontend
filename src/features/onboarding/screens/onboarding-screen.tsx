import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
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

import { colors, layout, motion, spacing } from '@/theme';
import { advanceOnboarding, type OnboardingPosition } from '../advance-onboarding';
import { stageRatio, OnboardingHero } from '../components/onboarding-hero';
import { OnboardingPanel } from '../components/onboarding-panel';
import { onboardingSlides } from '../data/onboarding-slides';

// The approved onboarding artwork has a warmer cream-to-mint wash than the shared calm gradient.
const heroGradient = ['#FFFCF9', '#E6F9F3'] as const;
const theme = colors.light;

export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [viewportHeight, setViewportHeight] = useState(window.height);
  const [panelHeight, setPanelHeight] = useState(0);
  const [page, setPage] = useState(0);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const position = useRef<OnboardingPosition>({ page: 0, lockedUntil: 0, completed: false });
  const slide = onboardingSlides[page];
  const width = Math.max(0, Math.min(layout.screenMax, window.width - insets.left - insets.right));

  // Keep the complete illustration visible on short screens and let the panel scroll
  // when its text needs extra room. A taller viewport gives the stage the remaining space.
  const artworkHeight = width / stageRatio;
  const minimumStageHeight = slide.showsBrand
    ? artworkHeight * 0.9 + insets.top + spacing.xl * Math.max(0, window.fontScale - 1)
    : artworkHeight * 0.78;
  const stageHeight = panelHeight
    ? Math.max(minimumStageHeight, viewportHeight - panelHeight)
    : Math.max(minimumStageHeight, Math.min(artworkHeight, viewportHeight * 0.64));

  useEffect(() => {
    if (Platform.OS !== 'web') {
      AccessibilityInfo.announceForAccessibility(
        `Onboarding, page ${page + 1} of ${onboardingSlides.length}. ${slide.title}`,
      );
    }
  }, [page, slide.title]);

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
      style={[styles.screen, { paddingLeft: insets.left, paddingRight: insets.right }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <ScrollView
        ref={scroll}
        onLayout={({ nativeEvent }) => setViewportHeight(nativeEvent.layout.height)}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}>
        <View style={[styles.flow, { width }]}>
          <LinearGradient colors={heroGradient} style={[styles.gradient, { height: stageHeight + spacing.xl }]} />
          <OnboardingHero slide={slide} height={stageHeight} topInset={insets.top} />
          <OnboardingPanel
            page={page}
            bottomInset={insets.bottom}
            onAdvance={handleAdvance}
            onLayout={({ nativeEvent }) => setPanelHeight(nativeEvent.layout.height)}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.backgroundElement },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  flow: { flexGrow: 1 },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0 },
});
