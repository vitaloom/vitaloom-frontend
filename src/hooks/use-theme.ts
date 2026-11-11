/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/theme';
import { useAppearance } from '@/theme/appearance-provider';

export function useTheme() {
  const { scheme } = useAppearance();
  return Colors[scheme];
}
