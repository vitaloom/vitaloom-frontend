/** Milliseconds. Respect the OS reduce-motion setting in every animation. */
export const motion = {
  duration: { instant: 0, feedback: 150, transition: 250, ambient: 400 },
  scale: { pressed: 0.98, resting: 1 },
} as const;
