import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { colors, layout, radius, sizing, spacing } from '@/theme';
import Svg, { Path } from 'react-native-svg';

const hero = require('../../../../assets/onboarding/welcome-hero.png');
const hills = require('../../../../assets/shared/mint-back-hills.png');
const waves = require('../../../../assets/shared/mint-middle-waves.png');
const leavesLeft = require('../../../../assets/shared/mint-leaves-left.png');
const leavesRight = require('../../../../assets/shared/mint-leaves-right.png');

// The slogan in the illustration is drawn in dark teal for a light canvas.
const scene = colors.light;

export function AuthHero() {
  const theme = useTheme();

  return (
    <View style={styles.stage}>
      <View style={styles.brand}>
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

        <ThemedText variant="title" style={styles.wordmark}>Healthy Check</ThemedText>
      </View>

      <View
        pointerEvents="none"
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        style={styles.artwork}>
        <Image source={hills} style={styles.hills} contentFit="fill" />
        <Image source={waves} style={styles.waves} contentFit="fill" />
        <Image source={leavesLeft} style={styles.leavesLeft} contentFit="contain" contentPosition="bottom left" />
        <Image source={leavesRight} style={styles.leavesRight} contentFit="contain" contentPosition="bottom right" />
        <Image source={hero} style={styles.hero} contentFit="contain" contentPosition="bottom center" />
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, overflow: 'hidden', alignItems: 'center', backgroundColor: scene.illustrationSurface },
  brand: { alignItems: 'center', gap: spacing.xs, paddingTop: spacing.sm, paddingHorizontal: spacing.md },
  mark: { height: sizing.iconMd, flexDirection: 'row', alignItems: 'center' },
  leaf: { width: sizing.iconSm, height: sizing.iconMd },
  markLeft: {
    backgroundColor: scene.activity,
    borderTopLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    transform: [{ rotate: '-25deg' }],
  },
  markRight: {
    backgroundColor: scene.accent,
    borderTopRightRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
    transform: [{ rotate: '25deg' }],
  },
  wordmark: { color: scene.text, textAlign: 'center' },
  artwork: { flex: 1, width: '100%', maxWidth: layout.screenMax },
  // Extend the landscape beyond the artwork slot to crop its transparent outer edges.
  hills: { position: 'absolute', left: '-8%', width: '116%', height: '68%', bottom: '8%' },
  waves: { position: 'absolute', left: '-8%', width: '116%', height: '34%', bottom: '-4%' },
  leavesLeft: { position: 'absolute', left: 0, width: '24%', height: '38%', bottom: '10%', opacity: 0.62 },
  leavesRight: { position: 'absolute', right: 0, width: '24%', height: '32%', bottom: '4%', opacity: 0.62 },
  hero: { width: '100%', height: '100%' },
});
