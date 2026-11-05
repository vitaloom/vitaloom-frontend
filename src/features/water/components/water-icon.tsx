import { SymbolView } from 'expo-symbols';
import { type ComponentProps } from 'react';

import { sizing } from '@/theme';

const icons = {
  water: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' },
  waterOutline: { ios: 'drop', android: 'water_drop', web: 'water_drop' },
  calendar: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
} as const satisfies Record<string, ComponentProps<typeof SymbolView>['name']>;

export function Icon({ name, color, size = sizing.iconMd }: { name: keyof typeof icons; color: string; size?: number }) {
  return <SymbolView name={icons[name]} tintColor={color} size={size} />;
}
