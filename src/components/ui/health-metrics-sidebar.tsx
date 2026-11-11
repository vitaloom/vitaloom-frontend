import { useEffect, useState } from 'react';
import { BackHandler, Keyboard, Platform, Pressable, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, sizing, spacing } from '@/theme';
import { useTranslations } from '@/i18n';
import { sharedUiMessages } from './messages';

const items = [
  { labelKey: 'nav.metric.water', route: '/water', marker: '◌' },
  { labelKey: 'nav.metric.sleep', route: '/sleep', marker: '☾' },
  { labelKey: 'nav.metric.heartRate', route: '/heart-rate', marker: '♡' },
  { labelKey: 'nav.metric.steps', route: '/steps', marker: '⌁' },
] as const;

export function HealthMetricsSidebar({ brandedHeader = false }: { brandedHeader?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const t = useTranslations(sharedUiMessages);

  useEffect(() => {
    if (!open) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { setOpen(false); return true; });
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    if (Platform.OS === 'web') globalThis.addEventListener('keydown', onKeyDown);
    return () => { subscription.remove(); if (Platform.OS === 'web') globalThis.removeEventListener('keydown', onKeyDown); };
  }, [open]);

  const active = (route: string) => pathname === route || pathname.startsWith(`${route}/`);
  const go = (route: string) => { setOpen(false); Keyboard.dismiss(); router.push(route as never); };
  return <>
    <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', minHeight: sizing.controlComfortable, flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('nav.openHealthMetrics')} accessibilityState={{ expanded: open }} onPress={() => setOpen(true)} style={{ width: sizing.controlComfortable, height: sizing.controlComfortable, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md }}>
        <ThemedText variant="heading" themeColor="accent">☰</ThemedText>
      </Pressable>
      <ThemedText variant={brandedHeader ? 'heading' : 'label'} themeColor={brandedHeader ? 'text' : 'textSecondary'} style={{ marginLeft: spacing.sm }}>{brandedHeader ? 'VitaLoom' : t('nav.healthMetrics')}</ThemedText>
    </View>
    {open ? <View style={{ position: 'absolute', zIndex: 50, top: -insets.top, left: -spacing.md, right: -spacing.md, bottom: -insets.bottom, flexDirection: 'row' }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('nav.close')} onPress={() => setOpen(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.overlay }} />
      <View accessibilityRole="none" style={{ width: 300, maxWidth: '86%', height: '100%', paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.md, backgroundColor: theme.backgroundElement, gap: spacing.sm, boxShadow: '4px 0px 20px rgba(18, 59, 62, 0.18)' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
          <ThemedText variant="heading">{t('nav.healthMetrics')}</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel={t('nav.close')} onPress={() => setOpen(false)} style={{ minWidth: sizing.controlComfortable, minHeight: sizing.controlComfortable, alignItems: 'center', justifyContent: 'center' }}><ThemedText variant="heading">×</ThemedText></Pressable>
        </View>
        {items.map((item) => <Pressable key={item.route} accessibilityRole="button" accessibilityState={{ selected: active(item.route) }} onPress={() => go(item.route)} style={{ minHeight: sizing.controlComfortable, paddingHorizontal: spacing.md, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, alignItems: 'center', backgroundColor: active(item.route) ? theme.backgroundSelected : 'transparent' }}>
          <ThemedText variant="heading" themeColor={active(item.route) ? 'accent' : 'textSecondary'}>{item.marker}</ThemedText>
          <ThemedText variant="bodyStrong" themeColor={active(item.route) ? 'accent' : 'text'}>{t(item.labelKey)}</ThemedText>
        </Pressable>)}
      </View>
    </View> : null}
  </>;
}
