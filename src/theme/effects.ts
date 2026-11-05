/** Box shadows use the React Native 0.88 boxShadow property. */
export const shadows = {
  card: '0 8px 24px rgba(18, 59, 62, 0.09)',
  floating: '0 8px 24px rgba(18, 59, 62, 0.13)',
  overlay: '0 16px 40px rgba(18, 59, 62, 0.20)',
} as const;

/** Color stops are data; choose a platform-supported renderer at use site. */
export const gradients = {
  water: ['#E3F9FB', '#9EE5EB'] as const,
  action: ['#159C98', '#087F7A'] as const,
  calm: ['#F4FBF8', '#E8F4EC'] as const,
} as const;

export const glass = { light: { tint: '#FFFFFF', opacity: 0.82 }, dark: { tint: '#1A3436', opacity: 0.88 } } as const;
