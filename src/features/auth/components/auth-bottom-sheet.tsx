import type { ReactNode } from 'react';
import { Pressable, ScrollView } from 'react-native';
import Animated, { useReducedMotion, type CSSAnimationProperties } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { layout, radius, shadows, sizing, spacing } from '@/theme';
import { useTranslations } from '@/i18n';
import { authMessages } from '../messages';

const AnimatedSafeAreaView = Animated.createAnimatedComponent(SafeAreaView);
const formEntrance: CSSAnimationProperties = {
  animationName: {
    from: { transform: [{ translateY: '100%' }] },
    to: { transform: [{ translateY: '0%' }] },
  },
  animationDuration: 420,
  animationTimingFunction: 'ease-out',
  animationFillMode: 'backwards',
};

type Props = {
  title: string;
  onClose?: () => void;
  hidden?: boolean;
  children: ReactNode;
};

export function AuthBottomSheet({ title, onClose, hidden = false, children }: Props) {
  const theme = useTheme();
  const t = useTranslations(authMessages);
  const reduceMotion = useReducedMotion();
  return (
    <AnimatedSafeAreaView
      aria-hidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      pointerEvents={hidden ? 'none' : 'auto'}
      edges={['bottom']}
      style={[
        { maxHeight: '78%', backgroundColor: theme.backgroundElement, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, boxShadow: shadows.overlay },
        hidden && { opacity: 0 },
        onClose && !reduceMotion && formEntrance,
      ]}>
      <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ width: '100%', maxWidth: layout.screenMax, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md }}>
        {onClose ? <Pressable accessibilityRole="button" accessibilityLabel={t('closeForm')} onPress={onClose} style={{ position: 'absolute', right: spacing.md, top: spacing.sm, zIndex: 2, minHeight: sizing.controlMin, minWidth: sizing.controlMin, alignItems: 'center', justifyContent: 'center' }}><ThemedText variant="heading" themeColor="textSecondary">×</ThemedText></Pressable> : null}
        <ThemedText variant="largeTitle" style={{ textAlign: 'center', paddingHorizontal: spacing.lg }}>{title}</ThemedText>
        {children}
      </ScrollView>
    </AnimatedSafeAreaView>
  );
}
