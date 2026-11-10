import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, shadows, sizing, spacing } from '@/theme';

export function AuthBottomSheet({ title, onClose, children }: { title: string; onClose?: () => void; children: ReactNode }) {
  const theme = useTheme();
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'flex-end' }} pointerEvents="box-none">
    {onClose ? <View style={{ flex: 1, backgroundColor: theme.overlay }} pointerEvents="none" /> : <View style={{ flex: 1 }} pointerEvents="none" />}
    <SafeAreaView edges={['bottom']} style={{ maxHeight: '78%', backgroundColor: theme.backgroundElement, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, boxShadow: shadows.overlay }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md }}>
        {onClose ? <Pressable accessibilityRole="button" accessibilityLabel="Close form" onPress={onClose} style={{ position: 'absolute', right: spacing.md, top: spacing.sm, zIndex: 2, minHeight: sizing.controlMin, minWidth: sizing.controlMin, alignItems: 'center', justifyContent: 'center' }}><ThemedText variant="heading" themeColor="textSecondary">×</ThemedText></Pressable> : null}
        <ThemedText variant="largeTitle" style={{ textAlign: 'center', paddingHorizontal: spacing.lg }}>{title}</ThemedText>
        {children}
      </ScrollView>
    </SafeAreaView>
  </KeyboardAvoidingView>;
}
