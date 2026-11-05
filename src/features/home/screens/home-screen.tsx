import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { Image, Alert, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { CircularProgress } from '@/components/ui/circular-progress';
import { MiniBarChart } from '@/components/ui/mini-bar-chart';
import { MiniLineChart } from '@/components/ui/mini-line-chart';
import { WellnessIcon } from '@/components/ui/wellness-icon';
import { useTheme } from '@/hooks/use-theme';
import { radius, shadows, spacing } from '@/theme';
import { dashboardMetrics, dashboardUser, type DashboardUser, type MetricSummary } from '../data/dashboard';

function DashboardHeader({ user }: { user: DashboardUser }) {
  const theme = useTheme();
  return <View style={{ minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
    <LinearGradient colors={[theme.accentSoft, theme.backgroundElement]} style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {user.avatar ? <Image source={user.avatar} style={{ width: 56, height: 56 }} /> : <Text style={{ color: theme.accent, fontSize: 25, fontWeight: '700' }}>{user.name.charAt(0).toUpperCase()}</Text>}
    </LinearGradient>
    <View style={{ flex: 1 }}>
      <Text style={{ color: theme.textSecondary, fontSize: 16, lineHeight: 22 }}>Good morning</Text>
      <Text style={{ color: theme.text, fontSize: 24, lineHeight: 30, fontWeight: '700' }} numberOfLines={1}>{user.name} 👋</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={user.hasUnreadNotifications ? 'Notifications, unread' : 'Notifications'} onPress={() => Alert.alert('Notifications', 'Notification details are coming soon.')} style={({ pressed }) => ({ width: 50, height: 50, borderRadius: 25, backgroundColor: theme.backgroundElement, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1, boxShadow: shadows.card })}>
      <WellnessIcon name="bell" color={theme.text} size={25} />
      {user.hasUnreadNotifications ? <View style={{ position: 'absolute', right: 9, top: 7, width: 10, height: 10, borderRadius: 5, backgroundColor: theme.heartRate, borderWidth: 1, borderColor: theme.backgroundElement }} /> : null}
    </Pressable>
  </View>;
}

function WellnessBanner({ compact }: { compact: boolean }) {
  const theme = useTheme();
  return <LinearGradient colors={[theme.backgroundElement, theme.accentSoft, theme.stepsSoft]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 150, borderRadius: radius.xl, overflow: 'hidden', justifyContent: 'center', boxShadow: shadows.card }}>
    <Svg width="100%" height={86} viewBox="0 0 360 86" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0 }} accessibilityElementsHidden>
      <Path d="M0 48 C35 28 50 80 100 59 S170 61 215 45 S290 45 360 5 L360 86 L0 86Z" fill={theme.waterTrack} opacity={0.55} />
      <Path d="M0 60 C45 36 60 74 110 66 S176 42 225 62 S304 74 360 30 L360 86 L0 86Z" fill={theme.water} opacity={0.19} />
    </Svg>
    <Svg width={126} height={130} viewBox="0 0 126 130" style={{ position: 'absolute', right: 2, bottom: -10 }} accessibilityElementsHidden>
      <Path d="M52 127 C54 70 59 38 91 10 M49 105 C25 73 18 65 9 60 M57 80 C97 62 102 50 113 36" stroke={theme.steps} strokeWidth={3} fill="none" opacity={0.55} />
      <Path d="M50 84 C21 85 9 72 6 58 C28 58 43 64 50 84 M69 58 C75 31 93 21 112 23 C107 42 93 55 69 58 M62 102 C82 82 104 83 120 88 C110 105 89 112 62 102" fill={theme.steps} opacity={0.35} />
    </Svg>
    <Image source={require('../../../../assets/images/wellness-stretch.png')} resizeMode="contain" style={{ position: 'absolute', right: -6, bottom: -28, width: compact ? 139 : 163, height: compact ? 178 : 207 }} accessibilityIgnoresInvertColors />
    <View style={{ paddingLeft: spacing.lg, width: compact ? '70%' : '66%', zIndex: 1 }}>
      <Text style={{ color: theme.text, fontSize: compact ? 19 : 22, lineHeight: compact ? 24 : 27, fontWeight: '700' }}>A healthier you{'\n'}happier tomorrow</Text>
      <Text style={{ color: theme.textSecondary, fontSize: compact ? 12 : 13, lineHeight: 18, marginTop: 9 }}>Keep going. You’re doing great.</Text>
    </View>
  </LinearGradient>;
}

function MetricCard({ metric, compact }: { metric: MetricSummary; compact: boolean }) {
  const theme = useTheme();
  const accent = metric.key === 'steps' ? theme.steps : metric.key === 'heart-rate' ? theme.heartRate : metric.key === 'water' ? theme.water : theme.sleep;
  const soft = metric.key === 'steps' ? theme.stepsSoft : metric.key === 'heart-rate' ? theme.heartRateSoft : metric.key === 'water' ? theme.waterPanel : theme.sleepSoft;
  const chartColor = accent;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${metric.title}, ${metric.value}${metric.unit ? ` ${metric.unit}` : ''}, ${metric.secondary}. Open ${metric.title} details`} onPress={() => router.push(metric.route as Href)} style={({ pressed }) => ({ width: '48.5%', minHeight: compact ? 143 : 151, padding: compact ? 12 : 14, borderRadius: radius.xl, backgroundColor: theme.backgroundElement, boxShadow: shadows.card, opacity: pressed ? 0.78 : 1, overflow: 'hidden' })}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 31, height: 31, borderRadius: 16, backgroundColor: soft, alignItems: 'center', justifyContent: 'center' }}>
        <WellnessIcon name={metric.key} color={accent} size={19} />
      </View>
      <Text style={{ color: theme.text, fontSize: compact ? 14 : 15, fontWeight: '600', flex: 1 }} numberOfLines={1}>{metric.title}</Text>
      <WellnessIcon name="chevron" color={theme.textSecondary} size={16} />
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: compact ? 8 : 10, minHeight: 54 }}>
      <View style={{ flexShrink: 1 }}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: theme.text, fontSize: metric.key === 'sleep' ? (compact ? 23 : 25) : compact ? 27 : 30, lineHeight: 34, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{metric.value}{metric.unit ? <Text style={{ fontSize: compact ? 15 : 17, fontWeight: '500' }}> {metric.unit}</Text> : null}</Text>
        <Text style={{ color: theme.textSecondary, fontSize: compact ? 12 : 13, marginTop: 1 }} numberOfLines={1}>{metric.secondary}</Text>
      </View>
      {metric.current !== undefined && metric.goal !== undefined ? <CircularProgress value={metric.current} maxValue={metric.goal} size={compact ? 50 : 54} strokeWidth={6} color={accent} trackColor={soft} /> : null}
    </View>
    <View style={{ height: compact ? 31 : 34, marginTop: 8 }}>
      {metric.key === 'heart-rate' ? <MiniLineChart data={metric.chart} color={chartColor} height={compact ? 31 : 34} showPoints /> : <MiniBarChart data={metric.chart} color={chartColor} height={compact ? 31 : 34} trackColor={soft} />}
    </View>
  </Pressable>;
}

function Reminder() {
  const theme = useTheme();
  return <LinearGradient colors={[theme.backgroundElement, theme.accentSoft]} style={{ minHeight: 77, borderRadius: radius.xl, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden', boxShadow: shadows.card }}>
    <Svg width="100%" height={42} viewBox="0 0 360 42" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0 }} accessibilityElementsHidden><Path d="M0 23 C55 10 57 44 116 28 S205 32 250 34 S313 15 360 12 L360 42 L0 42Z" fill={theme.water} opacity={0.13} /></Svg>
    <View style={{ width: 49, height: 49, borderRadius: 25, backgroundColor: theme.stepsSoft, alignItems: 'center', justifyContent: 'center' }}><WellnessIcon name="sprout" color={theme.steps} size={30} /></View>
    <View style={{ flex: 1 }}>
      <Text style={{ color: theme.text, fontSize: 17, lineHeight: 22, fontWeight: '700' }}>Small habits add up.</Text>
      <Text style={{ color: theme.textSecondary, fontSize: 11, lineHeight: 15, marginTop: 3 }}>Explore each metric to review its journal, goals or statistics.</Text>
    </View>
  </LinearGradient>;
}

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
