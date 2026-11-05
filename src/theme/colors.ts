/** Brand values inferred from ../design screenshots; provisional until device review. */
export const palette = {
  teal: { 50: '#E8F8F6', 100: '#CEF1EE', 300: '#78D5D0', 500: '#159C98', 700: '#087F7A', 900: '#123B3E' },
  aqua: { 100: '#E3F9FB', 300: '#9EE5EB', 500: '#39BDD1' },
  mint: { 100: '#E8F4EC', 300: '#B9DEC9', 500: '#66AA87' },
  violet: { 100: '#EEE8FB', 500: '#8269C9' },
  coral: { 100: '#FFF0EC', 600: '#AD4E42' },
  neutral: { 0: '#FFFFFF', 50: '#F4FBF8', 100: '#EAF3F1', 300: '#D0E2E0', 600: '#4C696D', 900: '#123B3E' },
} as const;

/** Semantic role names mirror DTCG groups; use these in UI, not palette values. */
export const colors = {
  light: {
    text: palette.neutral[900],
    textSecondary: palette.neutral[600],
    textInverse: palette.neutral[0],
    background: palette.neutral[50],
    backgroundElement: palette.neutral[0],
    backgroundSelected: palette.teal[50],
    surfaceTint: palette.aqua[100],
    border: palette.neutral[300],
    accent: palette.teal[700],
    accentSoft: palette.teal[100],
    onAccent: palette.neutral[0],
    focus: palette.teal[700],
    success: palette.teal[700],
    warning: '#8A5B16',
    danger: palette.coral[600],
    water: palette.aqua[500],
    waterTrack: palette.teal[100],
    waterPanel: palette.aqua[100],
    waterPanelEdge: palette.aqua[300],
    sleep: palette.violet[500],
    activity: palette.mint[500],
    overlay: 'rgba(18, 59, 62, 0.48)',
  },
  dark: {
    text: '#E8F6F4',
    textSecondary: '#AAC5C4',
    textInverse: palette.neutral[900],
    background: '#102527',
    backgroundElement: '#1A3436',
    backgroundSelected: '#24494A',
    surfaceTint: '#1B444A',
    border: '#456365',
    accent: palette.teal[300],
    accentSoft: '#24494A',
    onAccent: '#102527',
    focus: palette.aqua[300],
    success: palette.teal[300],
    warning: '#E9BA73',
    danger: '#F1A49A',
    water: palette.aqua[300],
    waterTrack: '#31565A',
    waterPanel: '#1B444A',
    waterPanelEdge: '#456F72',
    sleep: '#B9A7EE',
    activity: palette.mint[300],
    overlay: 'rgba(0, 0, 0, 0.62)',
  },
} as const;

export type ColorScheme = keyof typeof colors;
export type ThemeColor = keyof typeof colors.light & keyof typeof colors.dark;
