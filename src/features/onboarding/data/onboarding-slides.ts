import type { ImageSourcePropType } from 'react-native';

type OnboardingSlide = {
  id: `ONB-SCR-00${1 | 2 | 3 | 4}`;
  title: string;
  description: string;
  action: 'Get Started' | 'Next';
  hero: ImageSourcePropType;
  landscape: ImageSourcePropType;
  showsBrand?: boolean;
};

export const onboardingSlides: readonly OnboardingSlide[] = [
  {
    id: 'ONB-SCR-001',
    title: 'Track · Improve · Feel Better',
    description: 'Monitor your healthy habits, understand your progress, and build a better lifestyle.',
    action: 'Get Started',
    hero: require('@/assets/onboarding/welcome-hero.png'),
    landscape: require('@/assets/onboarding/welcome-landscape.png'),
    showsBrand: true,
  },
  {
    id: 'ONB-SCR-002',
    title: 'Track What Matters',
    description: 'Keep an eye on your water intake, sleep, heart rate, and daily activity in one place.',
    action: 'Next',
    hero: require('@/assets/onboarding/track-hero.png'),
    landscape: require('@/assets/onboarding/track-landscape.png'),
  },
  {
    id: 'ONB-SCR-003',
    title: 'Build Healthy Habits',
    description: 'Set personal goals, track your consistency, and gradually build a healthier routine.',
    action: 'Next',
    hero: require('@/assets/onboarding/habits-hero.png'),
    landscape: require('@/assets/onboarding/habits-landscape.png'),
  },
  {
    id: 'ONB-SCR-004',
    title: 'See Your Progress',
    description: 'Turn small, daily actions into real change with clear insights and trends.',
    action: 'Get Started',
    hero: require('@/assets/onboarding/progress-hero.png'),
    landscape: require('@/assets/onboarding/progress-landscape.png'),
  },
];
