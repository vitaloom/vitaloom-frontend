import { Tabs } from 'expo-router';
import { MainTabBar } from '@/components/ui/main-tab-bar';
import { useTranslations } from '@/i18n';
import { sharedUiMessages } from '@/components/ui/messages';

export default function TabsLayout() {
  const t = useTranslations(sharedUiMessages);
  return (
    <Tabs tabBar={(props) => <MainTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" options={{ title: t('nav.home') }} />
      <Tabs.Screen name="statistics" options={{ title: t('nav.statistics') }} />
      <Tabs.Screen name="profile" options={{ title: t('nav.profile') }} />
    </Tabs>
  );
}
