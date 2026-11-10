export type OnboardingSlide = {
  id: `ONB-SCR-00${1 | 2 | 3 | 4}`;
  title: string;
  description: string;
  action: 'Get Started' | 'Next';
  hero: number;
  showsBrand?: boolean;
};

export const onboardingSlides: readonly OnboardingSlide[] = [
  {
    id: 'ONB-SCR-001',
    title: 'Track · Improve · Feel Better',
    description: 'Monitor your habits, understand your progress, and build a lifestyle.',
    action: 'Next',
    hero: require('@/assets/onboarding/welcome-hero.png'),
    showsBrand: true,
  },
  {
    id: 'ONB-SCR-002',
    title: 'Track What Matters',
    description: 'Keep an eye on your water intake, sleep, heart rate, and daily activity in one place.',
    action: 'Next',
    hero: require('@/assets/onboarding/track-hero.png'),
  },
  {
    id: 'ONB-SCR-003',
    title: 'Build Healthy Habits',
    description: 'Set personal goals, track your consistency, and gradually build a healthier routine.',
    action: 'Next',
    hero: require('@/assets/onboarding/habits-hero.png'),
  },
  {
    id: 'ONB-SCR-004',
    title: 'See Your Progress',
    description: 'Turn small, daily actions into real change with clear insights and trends.',
    action: 'Get Started',
    hero: require('@/assets/onboarding/progress-hero.png'),
  },
];
