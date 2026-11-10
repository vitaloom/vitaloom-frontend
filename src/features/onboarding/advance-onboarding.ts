export type OnboardingPosition = {
  page: number;
  lockedUntil: number;
  completed: boolean;
};

export function advanceOnboarding(
  position: OnboardingPosition,
  now: number,
  pageCount: number,
  transitionDuration: number,
): OnboardingPosition {
  if (position.completed || now < position.lockedUntil) return position;

  if (position.page === pageCount - 1) {
    return { ...position, completed: true };
  }

  return {
    page: position.page + 1,
    lockedUntil: now + transitionDuration,
    completed: false,
  };
}
