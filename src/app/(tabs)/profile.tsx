import { router } from 'expo-router';

import { useAuth } from '@/features/auth/store/auth-context';
import { ProfileOverviewFlow } from '@/features/personal-health-profile/flows/profile-overview-flow';

export default function ProfileRoute() {
  const { user, signOut, retryRestore } = useAuth();
  if (!user) return null;

  return (
    <ProfileOverviewFlow
      key={user.id}
      accountId={user.id}
      onBack={() => router.navigate('/(tabs)/home')}
      onEdit={() => router.push('/profile-edit')}
      onSignOut={() => void signOut()}
      onAuthRetry={retryRestore}
    />
  );
}
