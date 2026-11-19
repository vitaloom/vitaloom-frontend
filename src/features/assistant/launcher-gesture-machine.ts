export const LAUNCHER_GESTURE_CONFIG = Object.freeze({
  dragThresholdDp: 10,
  touchPendingMs: 250,
  activationRingMs: 750,
});

export type LauncherGesturePhase =
  | 'idle'
  | 'touch-pending'
  | 'ringing'
  | 'activated'
  | 'dragging'
  | 'recording'
  | 'limited';

export type LauncherGestureState = {
  phase: LauncherGesturePhase;
  touchId: number | null;
};

export type LauncherGestureEvent =
  | { type: 'down'; touchId: number }
  | { type: 'move'; touchId: number; distanceDp: number }
  | { type: 'hold-delay'; touchId: number }
  | { type: 'ring-complete'; touchId: number }
  | { type: 'recording-started'; touchId: number }
  | { type: 'recording-limited'; touchId: number }
  | { type: 'release'; touchId: number }
  | { type: 'cancel'; touchId: number };

export type LauncherGestureAction =
  | 'start-hold-timer'
  | 'start-ring-timer'
  | 'light-haptic'
  | 'activate-voice'
  | 'cancel-hold'
  | 'open-chat'
  | 'finish-recording';

export function createLauncherGestureState(): LauncherGestureState {
  return { phase: 'idle', touchId: null };
}

export function reduceLauncherGesture(
  state: LauncherGestureState,
  event: LauncherGestureEvent,
  config = LAUNCHER_GESTURE_CONFIG,
): { state: LauncherGestureState; actions: LauncherGestureAction[] } {
  const noChange = { state, actions: [] as LauncherGestureAction[] };

  if (event.type === 'down') {
    if (state.phase !== 'idle') return noChange;
    return {
      state: { phase: 'touch-pending', touchId: event.touchId },
      actions: ['start-hold-timer'],
    };
  }

  if (event.touchId !== state.touchId || state.phase === 'idle') return noChange;

  if (event.type === 'move') {
    if (event.distanceDp <= config.dragThresholdDp
      || !['touch-pending', 'ringing', 'activated'].includes(state.phase)) return noChange;
    return { state: { ...state, phase: 'dragging' }, actions: ['cancel-hold'] };
  }

  if (event.type === 'hold-delay' && state.phase === 'touch-pending') {
    return { state: { ...state, phase: 'ringing' }, actions: ['start-ring-timer'] };
  }

  if (event.type === 'ring-complete' && state.phase === 'ringing') {
    return { state: { ...state, phase: 'activated' }, actions: ['activate-voice'] };
  }

  if (event.type === 'recording-started' && state.phase === 'activated') {
    return { state: { ...state, phase: 'recording' }, actions: ['light-haptic'] };
  }

  if (event.type === 'recording-limited' && state.phase === 'recording') {
    return { state: { ...state, phase: 'limited' }, actions: [] };
  }

  if (event.type === 'cancel') {
    return { state: createLauncherGestureState(), actions: ['cancel-hold'] };
  }

  if (event.type === 'release') {
    const action = state.phase === 'touch-pending' ? 'open-chat'
      : state.phase === 'recording' || state.phase === 'limited' ? 'finish-recording'
        : state.phase === 'ringing' || state.phase === 'activated' ? 'cancel-hold'
          : undefined;
    return { state: createLauncherGestureState(), actions: action ? [action] : [] };
  }

  return noChange;
}
