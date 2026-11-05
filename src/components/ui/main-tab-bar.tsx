import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { radius, shadows } from '@/theme';
import { WellnessIcon, type WellnessIconName } from './wellness-icon';

const tabs: Record<string, { label: string; icon: WellnessIconName }> = {
  home: { label: 'Home', icon: 'home' },
  statistics: { label: 'Statistics', icon: 'statistics' },
  profile: { label: 'Profile', icon: 'profile' },
};

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export function MainTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return <View style={{ flexDirection: 'row', backgroundColor: theme.backgroundElement, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: 12, paddingTop: 5, paddingBottom: Math.max(insets.bottom, 9), minHeight: 72 + insets.bottom, boxShadow: shadows.floating }}>
    {state.routes.map((route, index) => {
      const tab = tabs[route.name];
      if (!tab) return null;
      const focused = state.index === index;
      return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={`${tab.label} tab`} accessibilityState={{ selected: focused }} onPress={() => navigateToTab(route.key)} style={({ pressed }) => ({ flex: 1, minHeight: 57, borderRadius: radius.xl, backgroundColor: focused ? theme.accentSoft : 'transparent', alignItems: 'center', justifyContent: 'center', gap: 3, opacity: pressed ? 0.7 : 1 })}>
        <WellnessIcon name={tab.icon} color={focused ? theme.accent : theme.textSecondary} size={23} />
        <Text style={{ color: focused ? theme.accent : theme.textSecondary, fontSize: 12, fontWeight: focused ? '700' : '500' }}>{tab.label}</Text>
      </Pressable>;
    })}
  </View>;
}
