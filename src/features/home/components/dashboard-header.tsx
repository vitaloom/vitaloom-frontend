import { LinearGradient } from 'expo-linear-gradient';
import { Image, Alert, Pressable, Text, View } from 'react-native';

import { WellnessIcon } from '@/components/ui/wellness-icon';
import { useTheme } from '@/hooks/use-theme';
import { shadows } from '@/theme';
import { type DashboardUser } from '../data/dashboard';

export function DashboardHeader({ user }: { user: DashboardUser }) {
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
