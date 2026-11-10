import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors, motion, sizing, spacing, typography } from '@/theme';
import type { OnboardingSlide } from '../data/onboarding-slides';
import { OnboardingLandscape } from './onboarding-landscape';

const artworkEntrance = FadeIn.duration(motion.duration.transition).reduceMotion(ReduceMotion.System);
const theme = colors.light;

type Props = {
  slide: OnboardingSlide;
  height: number;
  topInset: number;
};

export function OnboardingHero({ slide, height, topInset }: Props) {
  return (
    <View style={{ height }}>
      <Animated.View
        key={slide.id}
        entering={slide.showsBrand ? undefined : artworkEntrance}
        style={styles.stage}>
        <View
          pointerEvents="none"
          aria-hidden
          importantForAccessibility="no-hide-descendants"
          style={StyleSheet.absoluteFill}>
          <OnboardingLandscape slideId={slide.id} />
        </View>

        {slide.showsBrand && (
          <View style={[styles.brand, { marginTop: topInset + spacing.sm }]}>
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
            <Text style={styles.wordmark}>Healthy Check</Text>
            <Text style={styles.tagline}>{'Small habits\nfor a healthier, happier you'}</Text>
          </View>
        )}

        <View
          pointerEvents="none"
          aria-hidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.heroSlot,
            slide.showsBrand
              ? styles.welcomeHero
              : { marginTop: topInset + spacing.sm, marginBottom: spacing.sm },
          ]}>
          <Image source={slide.hero} contentFit="contain" contentPosition="bottom center" style={styles.hero} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1 },
  heroSlot: { flex: 1 },
  welcomeHero: { marginTop: spacing.sm },
  hero: { flex: 1, width: '100%' },
  brand: { alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg },
  wordmark: { ...typography.largeTitle, color: theme.text, textAlign: 'center' },
  tagline: { ...typography.subhead, color: theme.text, textAlign: 'center' },
});
