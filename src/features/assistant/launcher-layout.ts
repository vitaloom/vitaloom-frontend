export const LAUNCHER_LAYOUT = Object.freeze({
  buttonSize: 56,
  effectGutter: 16,
  hintHeight: 28,
  hintGap: 8,
});

export type LauncherPosition = { left: number; top: number };
export type LauncherInsets = { top: number; right: number; bottom: number; left: number };
export type LauncherLayoutBounds = {
  width: number;
  height: number;
  insets: LauncherInsets;
  tabBarHeight: number;
};

export function clampLauncherPosition(position: LauncherPosition, bounds: LauncherLayoutBounds): LauncherPosition {
  const minLeft = bounds.insets.left + LAUNCHER_LAYOUT.effectGutter;
  const maxLeft = Math.max(minLeft, bounds.width - bounds.insets.right - LAUNCHER_LAYOUT.buttonSize - LAUNCHER_LAYOUT.effectGutter);
  const minTop = bounds.insets.top + LAUNCHER_LAYOUT.hintHeight + LAUNCHER_LAYOUT.hintGap + LAUNCHER_LAYOUT.effectGutter;
  const bottomInset = Math.max(bounds.insets.bottom, bounds.tabBarHeight);
  const maxTop = Math.max(minTop, bounds.height - bottomInset - LAUNCHER_LAYOUT.buttonSize - LAUNCHER_LAYOUT.effectGutter);
  return {
    left: Math.min(Math.max(position.left, minLeft), maxLeft),
    top: Math.min(Math.max(position.top, minTop), maxTop),
  };
}

export function defaultLauncherPosition(bounds: LauncherLayoutBounds): LauncherPosition {
  return clampLauncherPosition({ left: Number.POSITIVE_INFINITY, top: Number.POSITIVE_INFINITY }, bounds);
}

export function getLauncherHintAlignment(
  position: LauncherPosition,
  viewportWidth: number,
  insets: Pick<LauncherInsets, 'left' | 'right'>,
): 'left' | 'center' | 'right' {
  const hintWidth = Math.min(220, Math.max(LAUNCHER_LAYOUT.buttonSize, viewportWidth - insets.left - insets.right));
  const hintOverhang = (hintWidth - LAUNCHER_LAYOUT.buttonSize) / 2;
  const leftSpace = position.left - insets.left;
  const rightSpace = viewportWidth - insets.right - position.left - LAUNCHER_LAYOUT.buttonSize;
  if (leftSpace < hintOverhang) return 'left';
  if (rightSpace < hintOverhang) return 'right';
  return 'center';
}
