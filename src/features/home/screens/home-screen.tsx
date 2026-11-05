import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { spacing } from '@/theme';
import { DashboardHeader } from '../components/dashboard-header';
import { MetricCard } from '../components/metric-card';
import { Reminder } from '../components/reminder';
import { WellnessBanner } from '../components/wellness-banner';
import { dashboardMetrics, dashboardUser } from '../data/dashboard';

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 370;
  return <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: spacing.lg, paddingHorizontal: spacing.md, alignItems: 'center' }}>
    <View style={{ width: '100%', maxWidth: 520, gap: 12 }}>
      <DashboardHeader user={dashboardUser} />
      <WellnessBanner compact={compact} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
        {dashboardMetrics.map((metric) => <MetricCard key={metric.key} metric={metric} compact={compact} />)}
      </View>
      <Reminder />
    </View>
  </ScrollView>;
}
