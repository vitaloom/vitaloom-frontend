export { palette, colors, type ColorScheme, type ThemeColor } from './colors';
export { spacing, sizing, layout } from './spacing';
export { radius } from './radius';
export { fonts, typography, type TypographyRole } from './typography';
export { shadows, gradients, glass } from './effects';
export { motion } from './motion';

// Starter-screen aliases point to the same tokens while those screens remain in the template.
export { colors as Colors } from './colors';
export { fonts as Fonts } from './typography';
import { spacing, sizing } from './spacing';
import { Platform } from 'react-native';
export const Spacing = {
  half: spacing.half, one: spacing.xs, two: spacing.sm, three: spacing.md,
  four: spacing.lg, five: spacing.xl, six: spacing.xxxl,
} as const;
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = sizing.contentMax;
