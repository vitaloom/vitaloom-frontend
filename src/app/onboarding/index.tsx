import { router, type Href } from 'expo-router';

import { OnboardingScreen } from '@/features/onboarding/screens/onboarding-screen';

// Authentication owns this destination. Its generated route type lands on the Auth branch.
const authWelcome = '/(auth)/welcome' as Href;

export default function OnboardingRoute() {
  return <OnboardingScreen onComplete={() => router.replace(authWelcome)} />;
}
