const test = require('node:test');
const assert = require('node:assert/strict');

const {
  LAUNCHER_GESTURE_CONFIG,
  createLauncherGestureState,
  reduceLauncherGesture,
} = require('../src/features/assistant/launcher-gesture-machine.ts');
const { clampLauncherPosition, defaultLauncherPosition, getLauncherHintAlignment, LAUNCHER_LAYOUT } = require('../src/features/assistant/launcher-layout.ts');

const step = (state, event) => reduceLauncherGesture(state, event);

test('quick release opens chat without starting the activation ring', () => {
  const down = step(createLauncherGestureState(), { type: 'down', touchId: 1 });
  assert.equal(down.state.phase, 'touch-pending');
  assert.deepEqual(down.actions, ['start-hold-timer']);

  const release = step(down.state, { type: 'release', touchId: 1 });
  assert.equal(release.state.phase, 'idle');
  assert.deepEqual(release.actions, ['open-chat']);
});

test('stationary hold starts a 750 ms ring after 250 ms, then activates once', () => {
  assert.equal(LAUNCHER_GESTURE_CONFIG.touchPendingMs, 250);
  assert.equal(LAUNCHER_GESTURE_CONFIG.activationRingMs, 750);
  const pending = step(createLauncherGestureState(), { type: 'down', touchId: 2 });
  const ringing = step(pending.state, { type: 'hold-delay', touchId: 2 });
  assert.equal(ringing.state.phase, 'ringing');
  assert.deepEqual(ringing.actions, ['start-ring-timer']);

  const activated = step(ringing.state, { type: 'ring-complete', touchId: 2 });
  assert.equal(activated.state.phase, 'activated');
  assert.deepEqual(activated.actions, ['activate-voice']);
  assert.deepEqual(step(activated.state, { type: 'ring-complete', touchId: 2 }).actions, []);
  const recording = step(activated.state, { type: 'recording-started', touchId: 2 });
  assert.deepEqual(recording.actions, ['light-haptic']);
  assert.deepEqual(step(recording.state, { type: 'recording-started', touchId: 2 }).actions, []);
});

test('movement over 10 dp wins over touch pending and a running ring', () => {
  assert.equal(LAUNCHER_GESTURE_CONFIG.dragThresholdDp, 10);
  const pending = step(createLauncherGestureState(), { type: 'down', touchId: 3 });
  assert.equal(step(pending.state, { type: 'move', touchId: 3, distanceDp: 10 }).state.phase, 'touch-pending');
  const drag = step(pending.state, { type: 'move', touchId: 3, distanceDp: 10.1 });
  assert.equal(drag.state.phase, 'dragging');
  assert.deepEqual(drag.actions, ['cancel-hold']);

  const ringing = step(pending.state, { type: 'hold-delay', touchId: 3 });
  const ringDrag = step(ringing.state, { type: 'move', touchId: 3, distanceDp: 11 });
  assert.equal(ringDrag.state.phase, 'dragging');
  assert.deepEqual(ringDrag.actions, ['cancel-hold']);
});

test('release during a partial ring cancels without opening chat or recording', () => {
  const pending = step(createLauncherGestureState(), { type: 'down', touchId: 4 });
  const ringing = step(pending.state, { type: 'hold-delay', touchId: 4 });
  const release = step(ringing.state, { type: 'release', touchId: 4 });
  assert.equal(release.state.phase, 'idle');
  assert.deepEqual(release.actions, ['cancel-hold']);
});

test('cancel and duplicate release cannot produce a second action', () => {
  const pending = step(createLauncherGestureState(), { type: 'down', touchId: 7 });
  const canceled = step(pending.state, { type: 'cancel', touchId: 7 });
  assert.equal(canceled.state.phase, 'idle');
  assert.deepEqual(canceled.actions, ['cancel-hold']);
  assert.deepEqual(step(canceled.state, { type: 'release', touchId: 7 }).actions, []);
});

test('drag while activation is pending cancels before any haptic or recording', () => {
  const pending = step(createLauncherGestureState(), { type: 'down', touchId: 8 });
  const ringing = step(pending.state, { type: 'hold-delay', touchId: 8 });
  const activated = step(ringing.state, { type: 'ring-complete', touchId: 8 });
  assert.deepEqual(activated.actions, ['activate-voice']);
  const drag = step(activated.state, { type: 'move', touchId: 8, distanceDp: 11 });
  assert.equal(drag.state.phase, 'dragging');
  assert.deepEqual(drag.actions, ['cancel-hold']);
});

test('only release after recording begins finalizes audio; stale touches do nothing', () => {
  const pending = step(createLauncherGestureState(), { type: 'down', touchId: 5 });
  const ringing = step(pending.state, { type: 'hold-delay', touchId: 5 });
  const activated = step(ringing.state, { type: 'ring-complete', touchId: 5 });
  const recording = step(activated.state, { type: 'recording-started', touchId: 5 });
  assert.equal(recording.state.phase, 'recording');
  assert.deepEqual(step(recording.state, { type: 'release', touchId: 4 }).actions, []);
  assert.deepEqual(step(recording.state, { type: 'release', touchId: 5 }).actions, ['finish-recording']);
});

test('launcher and hint stay inside safe, measured tab-bar bounds after layout changes', () => {
  const bounds = { width: 390, height: 844, insets: { top: 48, right: 0, bottom: 34, left: 0 }, tabBarHeight: 106 };
  const defaultPosition = defaultLauncherPosition(bounds);
  assert.deepEqual(defaultPosition, { left: 318, top: 666 });
  assert.deepEqual(clampLauncherPosition({ left: 900, top: 900 }, bounds), defaultPosition);
  assert.deepEqual(clampLauncherPosition({ left: -50, top: -50 }, bounds), { left: 16, top: 100 });
  assert.equal(LAUNCHER_LAYOUT.hintHeight, 28);
  assert.equal(LAUNCHER_LAYOUT.hintGap, 8);
  assert.equal(getLauncherHintAlignment({ left: 12, top: 300 }, 390, bounds.insets), 'left');
  assert.equal(getLauncherHintAlignment(defaultPosition, 390, bounds.insets), 'right');
  assert.equal(getLauncherHintAlignment({ left: 160, top: 300 }, 390, bounds.insets), 'center');
});
