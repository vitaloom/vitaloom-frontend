import { Tabs, router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { radius, shadows } from '@/theme';
import { WellnessIcon, type WellnessIconName } from './wellness-icon';
import { useTranslations } from '@/i18n';
import { sharedUiMessages } from './messages';

const tabs: Record<string, { labelKey: 'nav.home' | 'nav.statistics' | 'nav.profile'; icon: WellnessIconName }> = {
  home: { labelKey: 'nav.home', icon: 'home' },
  statistics: { labelKey: 'nav.statistics', icon: 'statistics' },
  profile: { labelKey: 'nav.profile', icon: 'profile' },
};

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export function MainTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const t = useTranslations(sharedUiMessages);
  return <View style={{ flexDirection: 'row', backgroundColor: theme.backgroundElement, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: 12, paddingTop: 5, paddingBottom: Math.max(insets.bottom, 9), minHeight: 72 + insets.bottom, boxShadow: shadows.floating }}>
    {state.routes.map((route, index) => {
      const tab = tabs[route.name];
      if (!tab) return null;
      const label = t(tab.labelKey);
      const focused = state.index === index;
      return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={t('nav.tab', { label })} accessibilityState={{ selected: focused }} onPress={() => navigateToTab(route.key)} style={({ pressed }) => ({ flex: 1, minHeight: 57, borderRadius: radius.xl, backgroundColor: focused ? theme.accentSoft : 'transparent', alignItems: 'center', justifyContent: 'center', gap: 3, opacity: pressed ? 0.7 : 1 })}>
        <WellnessIcon name={tab.icon} color={focused ? theme.text : theme.textSecondary} size={23} />
        <Text style={{ color: focused ? theme.text : theme.textSecondary, fontSize: 12, fontWeight: focused ? '700' : '500' }}>{label}</Text>
      </Pressable>;
    })}
  </View>;
}

export function HeartRateFooter() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const t = useTranslations(sharedUiMessages);
  const links = [
    { labelKey: 'nav.home' as const, icon: 'home' as const, route: '/(tabs)/home' },
    { labelKey: 'nav.statistics' as const, icon: 'statistics' as const, route: '/(tabs)/statistics' },
    { labelKey: 'nav.profile' as const, icon: 'profile' as const, route: '/(tabs)/profile' },
  ];
  return <View style={{ flexDirection: 'row', backgroundColor: theme.backgroundElement, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: 12, paddingTop: 5, paddingBottom: Math.max(insets.bottom, 9), minHeight: 72 + insets.bottom, boxShadow: shadows.floating }}>
    {links.map((link) => <Pressable key={link.route} accessibilityRole="button" accessibilityLabel={t(link.labelKey)} onPress={() => router.push(link.route as never)} style={({ pressed }) => ({ flex: 1, minHeight: 57, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', gap: 3, opacity: pressed ? 0.7 : 1 })}>
      <WellnessIcon name={link.icon} color={theme.textSecondary} size={23} />
      <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '500' }}>{t(link.labelKey)}</Text>
    </Pressable>)}
  </View>;
}
