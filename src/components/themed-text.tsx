import { Text, type TextProps } from 'react-native';

import { typography, type ThemeColor, type TypographyRole } from '@/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  variant?: TypographyRole;
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', variant, themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  const role = {
    default: 'body', title: 'display', small: 'label', smallBold: 'labelStrong',
    subtitle: 'largeTitle', link: 'label', linkPrimary: 'label', code: 'code',
  } as const;
  return <Text style={[typography[variant ?? role[type]], { color: theme[themeColor ?? (type === 'linkPrimary' ? 'accent' : 'text')] }, style]} {...rest} />;
}
