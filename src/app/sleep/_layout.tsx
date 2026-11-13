import { Stack } from 'expo-router';
import { useAuth } from '@/features/auth/store/auth-context';

export const unstable_settings = { initialRouteName: 'index' };

export default function SleepLayout() {
  const { user } = useAuth();
  return <Stack key={user?.id} screenOptions={{ headerShown: false }} />;
}
