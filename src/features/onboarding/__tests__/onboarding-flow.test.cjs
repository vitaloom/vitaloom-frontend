const assert = require('node:assert/strict');
const { test } = require('node:test');

const { advanceOnboarding } = require('../advance-onboarding.ts');

const start = { page: 0, lockedUntil: 0, completed: false };
const advance = (state, now) => advanceOnboarding(state, now, 4, 250);

test('the welcome CTA and each Next advance exactly one page', () => {
  const second = advance(start, 0);
  const third = advance(second, 250);
  const fourth = advance(third, 500);
  assert.deepEqual([second.page, third.page, fourth.page], [1, 2, 3]);
  assert.equal(fourth.completed, false);
});

test('rapid presses during a transition do not advance or finish', () => {
  const second = advance(start, 0);
  assert.equal(advance(second, 1), second);
  assert.equal(advance(second, 249), second);
  const fourth = advance(advance(second, 250), 500);
  assert.equal(advance(fourth, 749), fourth);
});

test('the final CTA completes only once and never wraps', () => {
  const fourth = { page: 3, lockedUntil: 0, completed: false };
  const complete = advance(fourth, 0);
  assert.equal(complete.completed, true);
  assert.equal(complete.page, 3);
  assert.equal(advance(complete, 1000), complete);
});
