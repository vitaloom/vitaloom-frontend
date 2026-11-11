import { useEffect, useState } from 'react';
import { BackHandler, Keyboard, Platform, Pressable, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, sizing, spacing } from '@/theme';
import { useTranslations } from '@/i18n';
import { sharedUiMessages } from './messages';
import { WellnessIcon, type WellnessIconName } from './wellness-icon';

const metrics: { labelKey: 'nav.metric.steps' | 'nav.metric.heartRate' | 'nav.metric.water' | 'nav.metric.sleep'; route: string; icon: WellnessIconName }[] = [
  { labelKey: 'nav.metric.steps', route: '/steps', icon: 'steps' },
  { labelKey: 'nav.metric.heartRate', route: '/heart-rate', icon: 'heart-rate' },
  { labelKey: 'nav.metric.water', route: '/water', icon: 'water' },
  { labelKey: 'nav.metric.sleep', route: '/sleep', icon: 'sleep' },
];

export function HealthMetricsSidebar({ brandedHeader = false }: { brandedHeader?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const t = useTranslations(sharedUiMessages);
  const active = (route: string) => pathname === route || pathname.startsWith(`${route}/`);
  const activeMetric = metrics.some((item) => active(item.route));
  const [groupState, setGroupState] = useState({ pathname, expanded: activeMetric });
  const groupExpanded = groupState.pathname === pathname ? groupState.expanded : activeMetric;

  useEffect(() => {
    if (!open) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { setOpen(false); return true; });
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    if (Platform.OS === 'web') globalThis.addEventListener('keydown', onKeyDown);
    return () => { subscription.remove(); if (Platform.OS === 'web') globalThis.removeEventListener('keydown', onKeyDown); };
  }, [open]);

  const go = (route: string) => { setOpen(false); Keyboard.dismiss(); router.push(route as never); };
  const navItem = (labelKey: 'nav.home' | 'nav.statistics' | 'nav.profile' | 'nav.metric.steps' | 'nav.metric.heartRate' | 'nav.metric.water' | 'nav.metric.sleep', route: string, icon: WellnessIconName, nested = false) => {
    const selected = active(route);
    return <Pressable key={route} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => go(route)} style={{ minHeight: sizing.controlComfortable, marginLeft: nested ? spacing.lg : 0, paddingHorizontal: spacing.md, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, alignItems: 'center', backgroundColor: selected ? theme.backgroundSelected : 'transparent' }}>
      <WellnessIcon name={icon} color={selected ? theme.accent : theme.textSecondary} size={21} />
      <ThemedText variant="bodyStrong" themeColor={selected ? 'accent' : 'text'}>{t(labelKey)}</ThemedText>
    </Pressable>;
  };

  return <>
    <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', minHeight: sizing.controlComfortable, flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('nav.openHealthMetrics')} accessibilityState={{ expanded: open }} onPress={() => setOpen(true)} style={{ width: sizing.controlComfortable, height: sizing.controlComfortable, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md }}>
        <ThemedText variant="heading" themeColor="accent">☰</ThemedText>
      </Pressable>
      <ThemedText variant={brandedHeader ? 'heading' : 'label'} themeColor={brandedHeader ? 'text' : 'textSecondary'} style={{ marginLeft: spacing.sm }}>{brandedHeader ? 'VitaLoom' : t('nav.healthMetrics')}</ThemedText>
    </View>
    {open ? <View style={{ position: 'absolute', zIndex: 50, top: -insets.top, left: -spacing.md, right: -spacing.md, bottom: -insets.bottom, flexDirection: 'row' }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('nav.close')} onPress={() => setOpen(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.overlay }} />
      <View accessibilityRole="none" style={{ width: 300, maxWidth: '86%', height: '100%', paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.md, backgroundColor: theme.backgroundElement, gap: spacing.xs, boxShadow: '4px 0px 20px rgba(18, 59, 62, 0.18)' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
          <ThemedText variant="heading">{t('nav.home')}</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel={t('nav.close')} onPress={() => setOpen(false)} style={{ minWidth: sizing.controlComfortable, minHeight: sizing.controlComfortable, alignItems: 'center', justifyContent: 'center' }}><ThemedText variant="heading">×</ThemedText></Pressable>
        </View>
        {navItem('nav.home', '/(tabs)/home', 'home')}
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: groupExpanded, selected: activeMetric }} onPress={() => setGroupState({ pathname, expanded: !groupExpanded })} style={{ minHeight: sizing.controlComfortable, paddingHorizontal: spacing.md, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, alignItems: 'center', backgroundColor: activeMetric ? theme.backgroundSelected : 'transparent' }}>
          <WellnessIcon name="steps" color={activeMetric ? theme.accent : theme.textSecondary} size={21} />
          <ThemedText variant="bodyStrong" themeColor={activeMetric ? 'accent' : 'text'} style={{ flex: 1 }}>{t('nav.healthMetrics')}</ThemedText>
          <ThemedText variant="bodyStrong" themeColor="textSecondary">{groupExpanded ? '⌄' : '›'}</ThemedText>
        </Pressable>
        {groupExpanded ? metrics.map((item) => navItem(item.labelKey, item.route, item.icon, true)) : null}
        <View style={{ height: 1, backgroundColor: theme.border, marginVertical: spacing.xs }} />
        {navItem('nav.statistics', '/(tabs)/statistics', 'statistics')}
        {navItem('nav.profile', '/(tabs)/profile', 'profile')}
      </View>
    </View> : null}
  </>;
}
