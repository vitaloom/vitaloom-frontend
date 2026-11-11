import { router } from 'expo-router';

import { useAuth } from '@/features/auth/store/auth-context';
import { ProfileEditFlow } from '@/features/personal-health-profile/flows/profile-editor-flow';

export default function ProfileEditRoute() {
  const { user, retryRestore } = useAuth();
  if (!user) return null;

  return (
    <ProfileEditFlow
      key={user.id}
      accountId={user.id}
      onCancel={() => router.dismissTo('/(tabs)/profile')}
      onAuthRetry={retryRestore}
    />
  );
}
