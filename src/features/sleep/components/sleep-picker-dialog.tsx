import type { ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme';
import { SleepButton } from './sleep-ui';

export function SleepPickerDialog({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return <Modal transparent animationType="none" onRequestClose={onClose}>
    <View style={[styles.overlay, {
      backgroundColor: theme.overlay,
      paddingTop: Math.max(insets.top, spacing.md),
      paddingBottom: Math.max(insets.bottom, spacing.md),
    }]}>
      <View accessibilityViewIsModal role="dialog" accessibilityLabel={title}
        style={[styles.dialog, { backgroundColor: theme.backgroundElement }]}>
        <ScrollView nestedScrollEnabled bounces={false} contentContainerStyle={styles.content}>
          <ThemedText accessibilityRole="header" variant="heading">{title}</ThemedText>
          {children}
          <SleepButton label="Cancel" variant="secondary" onPress={onClose} />
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  dialog: { width: '100%', maxWidth: 420, maxHeight: '100%', flexShrink: 1, borderRadius: radius.xl, overflow: 'hidden' },
  content: { padding: spacing.md, gap: spacing.md },
});
