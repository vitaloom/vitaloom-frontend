import { useState, type ComponentRef, type RefObject } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, sizing, spacing } from '@/theme';

type Props = { label: 'Email' | 'Password'; value: string; onChangeText: (value: string) => void; error?: string; inputRef?: RefObject<ComponentRef<typeof TextInput> | null>; onSubmitEditing?: () => void; returnKeyType?: 'next' | 'done'; newPassword?: boolean };

export function AuthFormField({ label, value, onChangeText, error, inputRef, onSubmitEditing, returnKeyType, newPassword = false }: Props) {
  const theme = useTheme();
  const password = label === 'Password';
  const [visible, setVisible] = useState(false);
  return <View style={{ gap: spacing.xs }}>
    <ThemedText variant="labelStrong">{label}</ThemedText>
    <View style={{ minHeight: sizing.controlComfortable + spacing.sm, borderWidth: 1, borderRadius: radius.lg, borderColor: error ? theme.danger : theme.accent, backgroundColor: theme.backgroundElement, flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.md }}>
      <TextInput ref={inputRef} accessibilityLabel={label} accessibilityHint={error} autoCapitalize="none" autoCorrect={false} autoComplete={password ? newPassword ? 'new-password' : 'password' : 'email'} textContentType={password ? newPassword ? 'newPassword' : 'password' : 'emailAddress'} keyboardType={password ? 'default' : 'email-address'} secureTextEntry={password && !visible} placeholder={label} placeholderTextColor={theme.textSecondary} value={value} onChangeText={onChangeText} onSubmitEditing={onSubmitEditing} returnKeyType={returnKeyType} style={{ flex: 1, minHeight: sizing.controlComfortable, color: theme.text, fontSize: 17, paddingVertical: spacing.sm }} />
      {password ? <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Hide password' : 'Show password'} accessibilityState={{ selected: visible }} onPress={() => setVisible(!visible)} hitSlop={spacing.sm} style={{ minWidth: sizing.controlMin, minHeight: sizing.controlMin, alignItems: 'center', justifyContent: 'center' }}><ThemedText themeColor="textSecondary">{visible ? 'Hide' : 'Show'}</ThemedText></Pressable> : null}
    </View>
    {error ? <ThemedText themeColor="danger" accessibilityRole="alert" variant="subhead">{error}</ThemedText> : null}
  </View>;
}
