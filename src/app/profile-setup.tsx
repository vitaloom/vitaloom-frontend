import { Redirect, router } from 'expo-router';
import { useRef, useState } from 'react';

import { useAuth } from '@/features/auth/store/auth-context';
import { ProfileSetupFlow } from '@/features/personal-health-profile/flows/profile-editor-flow';

export default function ProfileSetupRoute() {
  const { user, pendingProfileInvitation, resolveProfileInvitation, retryRestore } = useAuth();
  const [finishing, setFinishing] = useState(false);
  const [skipError, setSkipError] = useState(false);
  const finishInFlight = useRef(false);
  if (!user) return null;
  if (!pendingProfileInvitation && !finishing) return <Redirect href="/(tabs)/home" />;

  async function finish(decision: 'skipped' | 'completed') {
    if (finishInFlight.current) return;
    finishInFlight.current = true;
    setFinishing(true);
    setSkipError(false);
    try {
      await resolveProfileInvitation(decision);
      router.replace(decision === 'skipped' ? '/(tabs)/home' : '/(tabs)/profile');
    } catch {
      setSkipError(decision === 'skipped');
      setFinishing(false);
    } finally {
      finishInFlight.current = false;
    }
  }

  return (
    <ProfileSetupFlow
      key={user.id}
      accountId={user.id}
      onComplete={() => void finish('completed')}
      onSkip={() => void finish('skipped')}
      onCancel={() => router.dismissTo('/profile-setup-prompt')}
      onAuthRetry={retryRestore}
      skipError={skipError}
      skipBusy={finishing}
    />
  );
}
