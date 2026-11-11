import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useAppearance, type AppearancePreference } from '@/theme/appearance-provider';
import { radius, sizing, spacing } from '@/theme';

export function AppearanceSettings() {
  const theme = useTheme();
  const { preference, setPreference } = useAppearance();
  const [saveFailed, setSaveFailed] = useState(false);
  const requestId = useRef(0);

  return (
    <View style={{ backgroundColor: theme.backgroundElement, borderColor: theme.border, borderWidth: 1, borderRadius: radius.xl, padding: spacing.md, gap: spacing.sm }}>
      <ThemedText variant="labelStrong">Appearance</ThemedText>
      <ThemedText variant="caption" themeColor="textSecondary">Choose how VitaLoom looks on this device.</ThemedText>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: spacing.xs }}>
        {(['system', 'light', 'dark'] as const).map((choice) => (
          <AppearanceChoice
            key={choice}
            choice={choice}
            selected={preference === choice}
            onSelect={() => {
              const currentRequest = ++requestId.current;
              setSaveFailed(false);
              void setPreference(choice).then((saved) => {
                if (!saved && requestId.current === currentRequest) setSaveFailed(true);
              });
            }}
          />
        ))}
      </View>
      {saveFailed ? <ThemedText accessibilityRole="alert" accessibilityLiveRegion="polite" variant="caption" themeColor="danger">Your appearance choice could not be saved. It will stay active until you close the app.</ThemedText> : null}
    </View>
  );
}

function AppearanceChoice({ choice, selected, onSelect }: { choice: AppearancePreference; selected: boolean; onSelect: () => void }) {
  const theme = useTheme();
  const label = choice === 'system' ? 'System' : choice === 'light' ? 'Light' : 'Dark';
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, selected }}
      onPress={onSelect}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: sizing.controlComfortable,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: selected ? theme.accent : theme.border,
        backgroundColor: selected ? theme.accent : theme.background,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.78 : 1,
      })}>
      <ThemedText variant="labelStrong" style={{ color: selected ? theme.onAccent : theme.text }}>{label}</ThemedText>
    </Pressable>
  );
}
