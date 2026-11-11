import { Redirect, router } from 'expo-router';
import { useState } from 'react';

import { useAuth } from '@/features/auth/store/auth-context';
import { ProfileSetupFlow } from '@/features/personal-health-profile/flows/profile-editor-flow';

export default function ProfileSetupRoute() {
  const { user, pendingProfileInvitation, resolveProfileInvitation, retryRestore } = useAuth();
  const [finishing, setFinishing] = useState(false);
  if (!user) return null;
  if (!pendingProfileInvitation && !finishing) return <Redirect href="/(tabs)/home" />;

  async function finish(decision: 'skipped' | 'completed') {
    if (finishing) return;
    setFinishing(true);
    await resolveProfileInvitation(decision);
    router.replace(decision === 'skipped' ? '/(tabs)/home' : '/(tabs)/profile');
  }

  return (
    <ProfileSetupFlow
      key={user.id}
      accountId={user.id}
      onComplete={() => void finish('completed')}
      onSkip={() => void finish('skipped')}
      onCancel={() => router.dismissTo('/profile-setup-prompt')}
      onAuthRetry={retryRestore}
    />
  );
}
