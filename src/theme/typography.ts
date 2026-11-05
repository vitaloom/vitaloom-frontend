import { Platform, type TextStyle } from 'react-native';

export const fonts = Platform.select({
  ios: { sans: 'system-ui', rounded: 'ui-rounded', serif: 'ui-serif', mono: 'ui-monospace' },
  web: { sans: 'var(--font-display)', rounded: 'var(--font-rounded)', serif: 'var(--font-serif)', mono: 'var(--font-mono)' },
  default: { sans: 'normal', rounded: 'normal', serif: 'serif', mono: 'monospace' },
})!;

/** Native text scaling remains enabled. Line heights are proportional to each role. */
export const typography = {
  display: { fontSize: 40, lineHeight: 48, fontWeight: '700', fontFamily: fonts.rounded },
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700', fontFamily: fonts.rounded },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', fontFamily: fonts.rounded },
  heading: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  body: { fontSize: 17, lineHeight: 25, fontWeight: '400' },
  bodyStrong: { fontSize: 17, lineHeight: 25, fontWeight: '600' },
  subhead: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  labelStrong: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  caption: { fontSize: 12, lineHeight: 18, fontWeight: '400' },
  metric: { fontSize: 32, lineHeight: 38, fontWeight: '700', fontVariant: ['tabular-nums'] },
  metricLarge: { fontSize: 38, lineHeight: 44, fontWeight: '700', fontVariant: ['tabular-nums'] },
  code: { fontSize: 12, lineHeight: 18, fontWeight: '500', fontFamily: fonts.mono },
} as const satisfies Record<string, TextStyle>;

export type TypographyRole = keyof typeof typography;
