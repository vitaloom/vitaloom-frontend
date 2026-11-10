import { ActivityIndicator, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, sizing, spacing } from '@/theme';

export function AuthPrimaryButton({ label, onPress, busy = false, disabled = false, outline = false }: { label: string; onPress: () => void; busy?: boolean; disabled?: boolean; outline?: boolean }) {
  const theme = useTheme();
  const unavailable = busy || disabled;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: unavailable, busy }} disabled={unavailable} onPress={onPress} style={({ pressed }) => ({ minHeight: sizing.controlComfortable + spacing.sm, borderRadius: radius.full, borderWidth: outline ? 1.5 : 0, borderColor: theme.accent, backgroundColor: outline ? theme.backgroundElement : theme.accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, opacity: unavailable ? 0.55 : pressed ? 0.82 : 1 })}>
    {busy ? <ActivityIndicator color={outline ? theme.accent : theme.onAccent} /> : null}
    <ThemedText variant="bodyStrong" style={{ color: outline ? theme.accent : theme.onAccent }}>{label}</ThemedText>
  </Pressable>;
}
