import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors, motion, sizing, spacing, typography } from '@/theme';
import { onboardingSlides } from '../data/onboarding-slides';

export const illustrationRatio = 390 / 570;
const artworkEntrance = FadeIn.duration(motion.duration.transition).reduceMotion(ReduceMotion.System);
const theme = colors.light;

type Props = {
  slide: (typeof onboardingSlides)[number];
  width: number;
  height: number;
  topInset: number;
};

export function OnboardingHero({ slide, width, height, topInset }: Props) {
  const [brandHeight, setBrandHeight] = useState(0);

  // The welcome figure starts about 28% down its canvas. Fit both layers together
  // so larger brand text can use that clear space without overlapping the figure.
  const roomBelowBrand = height - topInset - spacing.sm - brandHeight;
  const artworkHeight = Math.max(0, Math.min(
    height,
    width / illustrationRatio,
    slide.showsBrand ? roomBelowBrand / 0.75 : height,
  ));
  const artworkWidth = artworkHeight * illustrationRatio;

  return (
    <View style={{ height }}>
      <Animated.View
        key={slide.id}
        entering={slide.showsBrand ? undefined : artworkEntrance}
        pointerEvents="none"
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.artwork, { width: artworkWidth, height: artworkHeight }]}>
        <Image source={slide.landscape} resizeMode="contain" style={styles.layer} />
        <Image source={slide.hero} resizeMode="contain" style={styles.layer} />
      </Animated.View>

      {slide.showsBrand && (
        <View
          onLayout={({ nativeEvent }) => setBrandHeight(nativeEvent.layout.height)}
          style={[styles.brand, { marginTop: topInset + spacing.sm }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  artwork: { position: 'absolute', bottom: 0, alignSelf: 'center' },
  layer: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  brand: { alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg },
  wordmark: { ...typography.largeTitle, color: theme.text, textAlign: 'center' },
  tagline: { ...typography.subhead, color: theme.text, textAlign: 'center' },
});
