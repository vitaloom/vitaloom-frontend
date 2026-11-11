import { Modal, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme';
import { SleepButton } from './sleep-ui';

export function SleepConfirmation({ title, message, cancelLabel, confirmLabel, onCancel, onConfirm }: {
  title: string; message: string; cancelLabel: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void;
}) {
  const theme = useTheme();
  return <Modal transparent animationType="none" onRequestClose={onCancel}>
    <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
      <View accessibilityViewIsModal style={[styles.dialog, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText accessibilityRole="header" variant="heading">{title}</ThemedText>
        <ThemedText variant="subhead">{message}</ThemedText>
        <SleepButton label={cancelLabel} variant="secondary" onPress={onCancel} />
        <SleepButton label={confirmLabel} variant="danger" onPress={onConfirm} />
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  dialog: { width: '100%', maxWidth: 420, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.sm },
});
