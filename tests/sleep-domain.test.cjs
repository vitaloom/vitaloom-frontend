const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

const date = require('../src/features/sleep/utils/sleep-date.ts');
const validation = require('../src/features/sleep/utils/sleep-validation.ts');

test('civil-date helpers use explicit IANA timezone and Monday week boundaries', () => {
  assert.equal(date.shiftDay('2026-12-31', 1), '2027-01-01');
  assert.equal(date.startOfWeek('2026-11-11'), '2026-11-09');
  assert.equal(date.dayInZone(new Date('2026-11-10T17:30:00Z'), 'Asia/Ho_Chi_Minh'), '2026-11-11');
  assert.equal(date.shiftDay('0099-12-31', 1), '0100-01-01');
  assert.equal(date.startOfWeek('0001-01-01'), '0001-01-01');
});

test('DST folds require a selected offset and DST gaps are rejected', () => {
  const fold = { day: '2026-11-01', hour: '01', minute: '30' };
  assert.deepEqual(date.resolveCivil(fold, 'America/New_York'), {
    kind: 'ambiguous', options: [-240, -300],
  });
  assert.equal(date.resolveCivil({ ...fold, offsetMinutes: -300 }, 'America/New_York').kind, 'resolved');
  assert.equal(date.resolveCivil({ day: '2026-03-08', hour: '02', minute: '30' }, 'America/New_York').kind, 'invalid');
});

test('session validation preserves arbitrary exact minutes without synthetic timestamps', () => {
  const context = { today: '2026-11-11', timeZone: 'Asia/Ho_Chi_Minh' };
  const draft = { method: 'duration', sleepType: 'main', feeling: null, endDay: '2026-11-10', hours: '7', minutes: '17' };
  const result = validation.validateSession(draft, context, new Date('2026-11-11T03:00:00Z'));
  assert.equal(result.kind, 'valid');
  assert.equal(result.value.minutes, 437);
  assert.deepEqual(Object.keys(result.value).sort(), ['day', 'feeling', 'method', 'minutes', 'sleepType']);
});

test('session validation rejects zero, over-day and future duration-only entries', () => {
  const context = { today: '2026-11-11', timeZone: 'Asia/Ho_Chi_Minh' };
  const draft = { method: 'duration', sleepType: 'nap', feeling: 'normal', endDay: '2026-11-11', hours: '0', minutes: '0' };
  const now = new Date('2026-11-11T03:00:00Z');
  assert.equal(validation.validateSession(draft, context, now).kind, 'validation');
  assert.equal(validation.validateSession({ ...draft, hours: '24' }, context, now).kind, 'valid');
  assert.equal(validation.validateSession({ ...draft, hours: '24', minutes: '1' }, context, now).kind, 'validation');
  assert.equal(validation.validateSession({ ...draft, endDay: '2026-11-12', hours: '1' }, context, now).kind, 'validation');
});

test('range duration uses elapsed instants across DST and rejects unresolved transitions', () => {
  const context = { today: '2026-11-02', timeZone: 'America/New_York' };
  const draft = {
    method: 'range', sleepType: 'main', feeling: null, timeZone: context.timeZone,
    start: { day: '2026-11-01', hour: '01', minute: '30', offsetMinutes: -240 },
    end: { day: '2026-11-01', hour: '02', minute: '30', offsetMinutes: -300 },
  };
  const fold = validation.validateSession(draft, context, new Date('2026-11-02T12:00:00Z'));
  assert.equal(fold.kind, 'valid');
  assert.equal(fold.value.minutes, 120);
  const ambiguous = validation.validateSession({ ...draft, start: { ...draft.start, offsetMinutes: undefined } }, context, new Date('2026-11-02T12:00:00Z'));
  assert.equal(ambiguous.kind, 'validation');
  const spring = validation.validateSession({
    ...draft,
    start: { day: '2026-03-08', hour: '01', minute: '30', offsetMinutes: -300 },
    end: { day: '2026-03-08', hour: '03', minute: '30', offsetMinutes: -240 },
  }, context, new Date('2026-11-02T12:00:00Z'));
  assert.equal(spring.kind, 'valid');
  assert.equal(spring.value.minutes, 60);
});

test('civil resolution preserves old calendar years and historical offsets with seconds', () => {
  assert.deepEqual(date.resolveCivil({ day: '0001-01-02', hour: '03', minute: '04' }, 'UTC'),
    { kind: 'resolved', instant: '0001-01-02T03:04:00.000Z' });
  assert.deepEqual(date.resolveCivil({ day: '1900-01-01', hour: '10', minute: '00' }, 'Asia/Ho_Chi_Minh'),
    { kind: 'resolved', instant: '1900-01-01T02:53:30.000Z' });
});

test('goal validation enforces quarter-hour components and 24-hour ceiling', () => {
  assert.deepEqual(validation.validateGoal('8', '15'), { kind: 'valid', minutes: 495 });
  assert.equal(validation.validateGoal('0', '00').kind, 'validation');
  assert.equal(validation.validateGoal('1', '10').kind, 'validation');
  assert.equal(validation.validateGoal('24', '15').kind, 'validation');
});

test('confirmed mutations refresh readers, keep revisions, and preserve account isolation', async () => {
  const { MockSleepRepository } = require('../src/features/sleep/mocks/mock-sleep-repository.ts');
  const first = new MockSleepRepository('account-one', { today: '2026-11-11', scenario: 'empty' });
  const second = new MockSleepRepository('account-two', { today: '2026-11-11', scenario: 'empty' });
  let notifications = 0;
  first.subscribe(() => notifications++);
  const save = await first.mutate('create-1', {
    kind: 'create-session',
    draft: { method: 'duration', sleepType: 'main', feeling: null, endDay: '2026-11-10', hours: '2', minutes: '17' },
  });
  assert.equal(save.kind, 'confirmed');
  assert.equal(notifications, 1);
  assert.equal((await first.getJournal()).data.sessions[0].minutes, 137);
  assert.equal((await second.getJournal()).data.sessions.length, 0);
});

test('unknown applied write remains hidden until reconciliation and attempt retry cannot duplicate it', async () => {
  const { MockSleepRepository } = require('../src/features/sleep/mocks/mock-sleep-repository.ts');
  const repository = new MockSleepRepository('unknown', { today: '2026-11-11', scenario: 'empty' });
  repository.setNextFault('unknown-after');
  const mutation = {
    kind: 'create-session',
    draft: { method: 'duration', sleepType: 'main', feeling: null, endDay: '2026-11-10', hours: '2', minutes: '0' },
  };
  const first = await repository.mutate('attempt-1', mutation);
  assert.deepEqual(first, { kind: 'unknown', attemptId: 'attempt-1' });
  assert.equal((await repository.getJournal()).data.sessions.length, 0);
  assert.deepEqual(await repository.mutate('attempt-1', mutation), first);
  assert.equal((await repository.reconcile('attempt-1')).kind, 'confirmed');
  assert.equal((await repository.getJournal()).data.sessions.length, 1);
});

test('unknown creation revalidates overlap after another confirmed session is written', async () => {
  const { MockSleepRepository } = require('../src/features/sleep/mocks/mock-sleep-repository.ts');
  const repository = new MockSleepRepository('recheck', { today: '2026-11-11', scenario: 'empty' });
  const range = (start, end) => ({
    method: 'range', sleepType: 'main', feeling: null, timeZone: 'UTC',
    start: { day: '2026-11-10', hour: start, minute: '00' },
    end: { day: '2026-11-10', hour: end, minute: '00' },
  });
  repository.setNextFault('unknown-after');
  const uncertain = await repository.mutate('uncertain-range', { kind: 'create-session', draft: range('01', '02') });
  assert.equal(uncertain.kind, 'unknown');
  assert.equal((await repository.mutate('other-range', { kind: 'create-session', draft: range('01', '03') })).kind, 'confirmed');
  const reconciled = await repository.reconcile('uncertain-range');
  assert.deepEqual(reconciled.kind === 'conflict' ? reconciled.reason : null, 'overlap');
  assert.equal((await repository.getJournal()).data.sessions.length, 1);
  assert.equal((await repository.reconcile('uncertain-range')).kind, 'conflict');
});

test('unknown deletion cannot erase a record changed before reconciliation', async () => {
  const { MockSleepRepository } = require('../src/features/sleep/mocks/mock-sleep-repository.ts');
  const repository = new MockSleepRepository('delete-race', { today: '2026-11-11', scenario: 'empty' });
  const draft = { method: 'duration', sleepType: 'main', feeling: null, endDay: '2026-11-10', hours: '2', minutes: '0' };
  const created = await repository.mutate('create-record', { kind: 'create-session', draft });
  repository.setNextFault('unknown-after');
  assert.equal((await repository.mutate('uncertain-delete', {
    kind: 'delete-session', id: created.recordId, revision: created.revision,
  })).kind, 'unknown');
  assert.equal((await repository.mutate('edit-record', {
    kind: 'update-session', id: created.recordId, revision: created.revision,
    draft: { ...draft, hours: '3' },
  })).kind, 'confirmed');
  const reconciled = await repository.reconcile('uncertain-delete');
  assert.deepEqual(reconciled.kind === 'conflict' ? reconciled.reason : null, 'stale');
  const session = (await repository.getSession(created.recordId)).data;
  assert.equal(session.minutes, 180);
  assert.equal(session.revision, 2);
});

test('pending write captures its payload and terminal validation receipts are idempotent', async () => {
  const { MockSleepRepository } = require('../src/features/sleep/mocks/mock-sleep-repository.ts');
  const repository = new MockSleepRepository('copy-write', { today: '2026-11-11', scenario: 'empty' });
  repository.setNextFault('unknown-after');
  const mutation = {
    kind: 'create-session',
    draft: { method: 'duration', sleepType: 'main', feeling: null, endDay: '2026-11-10', hours: '2', minutes: '1' },
  };
  await repository.mutate('captured-write', mutation);
  mutation.draft.hours = '3';
  assert.equal((await repository.reconcile('captured-write')).kind, 'confirmed');
  assert.equal((await repository.getJournal()).data.sessions[0].minutes, 121);
  const invalid = { kind: 'create-session', draft: { ...mutation.draft, hours: '24', minutes: '1' } };
  const first = await repository.mutate('invalid-write', invalid);
  assert.equal(first.kind, 'validation');
  assert.deepEqual(await repository.mutate('invalid-write', { kind: 'create-session', draft: { ...invalid.draft } }), first);
  invalid.draft.hours = '1';
  assert.equal((await repository.mutate('invalid-write', invalid)).kind, 'rejected');
});

test('time ranges reject overlaps but allow adjacent intervals', async () => {
  const { MockSleepRepository } = require('../src/features/sleep/mocks/mock-sleep-repository.ts');
  const repository = new MockSleepRepository('ranges', { today: '2026-11-11', scenario: 'empty' });
  const range = (start, end) => ({
    method: 'range', sleepType: 'main', feeling: null, timeZone: 'UTC',
    start: { day: '2026-11-10', hour: start, minute: '00' },
    end: { day: '2026-11-10', hour: end, minute: '00' },
  });
  assert.equal((await repository.mutate('one', { kind: 'create-session', draft: range('01', '02') })).kind, 'confirmed');
  assert.equal((await repository.mutate('overlap', { kind: 'create-session', draft: range('01', '03') })).kind, 'conflict');
  assert.equal((await repository.mutate('adjacent', { kind: 'create-session', draft: range('02', '03') })).kind, 'confirmed');
});

test('journal pagination and source-record selection are stable and scoped', async () => {
  const { MockSleepRepository } = require('../src/features/sleep/mocks/mock-sleep-repository.ts');
  const repository = new MockSleepRepository('pages', { today: '2026-11-11' });
  const first = await repository.getJournal({ limit: 2 });
  assert.equal(first.kind, 'ready');
  assert.equal(first.data.sessions.length, 2);
  assert.ok(first.data.nextCursor);
  const second = await repository.getJournal({ limit: 2, cursor: first.data.nextCursor });
  assert.equal(second.kind, 'ready');
  assert.notEqual(second.data.sessions[0].id, first.data.sessions[0].id);
  const source = await repository.getJournal({ sourceIds: [first.data.sessions[0].id] });
  assert.deepEqual(source.data.sessions.map(({ id }) => id), [first.data.sessions[0].id]);
  const changed = await repository.mutate('new-record', {
    kind: 'create-session',
    draft: { method: 'duration', sleepType: 'nap', feeling: null, endDay: '2026-11-10', hours: '1', minutes: '0' },
  });
  assert.equal(changed.kind, 'confirmed');
  assert.equal((await repository.getJournal({ limit: 2, cursor: first.data.nextCursor })).kind, 'error');
});

test('edit can change entry mode while preserving reference-zone constraints and exact values', async () => {
  const { MockSleepRepository } = require('../src/features/sleep/mocks/mock-sleep-repository.ts');
  const repository = new MockSleepRepository('edit', { today: '2026-11-11', scenario: 'empty' });
  const timeRange = {
    method: 'range', sleepType: 'main', feeling: null, timeZone: 'UTC',
    start: { day: '2026-11-10', hour: '01', minute: '00' },
    end: { day: '2026-11-10', hour: '07', minute: '00' },
  };
  const created = await repository.mutate('range-create', { kind: 'create-session', draft: timeRange });
  assert.equal(created.kind, 'confirmed');
  const wrongZone = await repository.mutate('zone-change', {
    kind: 'update-session', id: created.recordId, revision: created.revision,
    draft: { ...timeRange, timeZone: 'America/New_York' },
  });
  assert.equal(wrongZone.kind, 'validation');
  const duration = await repository.mutate('mode-change', {
    kind: 'update-session', id: created.recordId, revision: created.revision,
    draft: { method: 'duration', sleepType: 'nap', feeling: 'normal', endDay: '2026-11-10', hours: '3', minutes: '11' },
  });
  assert.equal(duration.kind, 'confirmed');
  const record = (await repository.getSession(created.recordId)).data;
  assert.equal(record.method, 'duration');
  assert.equal(record.minutes, 191);
  assert.equal('startAt' in record, false);
  assert.equal('endAt' in record, false);
});

test('record updates enforce stale and deleted revisions; deletion only follows a valid revision', async () => {
  const { MockSleepRepository } = require('../src/features/sleep/mocks/mock-sleep-repository.ts');
  const repository = new MockSleepRepository('revisions', { today: '2026-11-11', scenario: 'empty' });
  const created = await repository.mutate('create', {
    kind: 'create-session',
    draft: { method: 'duration', sleepType: 'main', feeling: null, endDay: '2026-11-10', hours: '1', minutes: '37' },
  });
  const stale = await repository.mutate('stale-update', {
    kind: 'update-session', id: created.recordId, revision: 0,
    draft: { method: 'duration', sleepType: 'main', feeling: null, endDay: '2026-11-10', hours: '2', minutes: '0' },
  });
  assert.deepEqual(stale.kind === 'conflict' ? stale.reason : null, 'stale');
  const deleted = await repository.mutate('delete', {
    kind: 'delete-session', id: created.recordId, revision: created.revision,
  });
  assert.equal(deleted.kind, 'confirmed');
  const retry = await repository.mutate('edit-deleted', {
    kind: 'update-session', id: created.recordId, revision: created.revision,
    draft: { method: 'duration', sleepType: 'main', feeling: null, endDay: '2026-11-10', hours: '2', minutes: '0' },
  });
  assert.deepEqual(retry.kind === 'conflict' ? retry.reason : null, 'deleted');
});

test('goal changes are effective forward and preserve historical values', async () => {
  const { MockSleepRepository } = require('../src/features/sleep/mocks/mock-sleep-repository.ts');
  const repository = new MockSleepRepository('goals', { today: '2026-11-11' });
  let goal = await repository.getGoal();
  const set = await repository.mutate('set-goal', { kind: 'set-goal', revision: goal.data.revision, hours: '8', minutes: '15' });
  assert.equal(set.kind, 'confirmed');
  goal = await repository.getGoal();
  assert.equal(goal.data.minutes, 495);
  const remove = await repository.mutate('remove-goal', { kind: 'remove-goal', revision: goal.data.revision });
  assert.equal(remove.kind, 'confirmed');
  assert.equal((await repository.getGoal('2026-11-10')).data.minutes, 480);
  assert.equal((await repository.getGoal('2026-11-11')).data.minutes, null);
});

test('the sparse fixture has verified records without eligible insights in the default week', async () => {
  const { MockSleepRepository } = require('../src/features/sleep/mocks/mock-sleep-repository.ts');
  const repository = new MockSleepRepository('sparse', { today: '2026-11-11', scenario: 'insufficient' });
  const result = await repository.getInsights({ week: '2026-11-02' });
  assert.equal(result.kind, 'ready');
  assert.equal(result.data.status, 'ready');
  assert.deepEqual(new Set(result.data.items.filter(({ status }) => status === 'insufficient').map(({ category }) => category)),
    new Set(['patterns', 'feelings', 'discoveries']));
  assert.equal(result.data.items.some(({ eligible }) => eligible), false);
});

test('a simulated network failure is distinct from a verified empty Insights read', async () => {
  const { MockSleepRepository } = require('../src/features/sleep/mocks/mock-sleep-repository.ts');
  const repository = new MockSleepRepository('offline', { today: '2026-11-11', scenario: 'network-error' });
  assert.equal((await repository.getInsights({ week: '2026-11-02' })).kind, 'error');
  assert.equal((await repository.getJournal()).kind, 'error');
  const empty = new MockSleepRepository('empty', { today: '2026-11-11', scenario: 'empty' });
  assert.equal((await empty.getInsights({ week: '2026-11-02' })).data.status, 'no-data');
});

test('an exact journal date follows the stored wake day across midnight', async () => {
  const { MockSleepRepository } = require('../src/features/sleep/mocks/mock-sleep-repository.ts');
  const repository = new MockSleepRepository('wake-day', { today: '2026-11-11', scenario: 'empty' });
  const draft = {
    method: 'range', sleepType: 'main', feeling: null, timeZone: 'Asia/Ho_Chi_Minh',
    start: { day: '2026-11-09', hour: '23', minute: '50' },
    end: { day: '2026-11-10', hour: '07', minute: '04' },
  };
  const saved = await repository.mutate('overnight', { kind: 'create-session', draft });
  assert.equal(saved.kind, 'confirmed');
  assert.deepEqual((await repository.getJournal({ from: draft.start.day, to: draft.start.day })).data.sessions, []);
  const journal = await repository.getJournal({ from: draft.end.day, to: draft.end.day });
  assert.equal(journal.data.verified, true);
  assert.deepEqual(journal.data.sessions.map(({ id, day, minutes }) => ({ id, day, minutes })),
    [{ id: saved.recordId, day: draft.end.day, minutes: 434 }]);
});

test('an invalid 24-hour goal draft leaves a missing goal inactive', async () => {
  const { MockSleepRepository } = require('../src/features/sleep/mocks/mock-sleep-repository.ts');
  const repository = new MockSleepRepository('invalid-goal', { today: '2026-11-11', scenario: 'no-goal' });
  const { data: goal } = await repository.getGoal();
  assert.equal(goal.minutes, null);
  const invalid = await repository.mutate('invalid-goal', { kind: 'set-goal', revision: goal.revision, hours: '24', minutes: '15' });
  assert.equal(invalid.kind, 'validation');
  assert.deepEqual((await repository.getGoal()).data, goal);
});

test('an uncertain edit keeps the confirmed duration until the same attempt is checked', async () => {
  const { MockSleepRepository } = require('../src/features/sleep/mocks/mock-sleep-repository.ts');
  const repository = new MockSleepRepository('uncertain-edit', { today: '2026-11-11', scenario: 'empty' });
  const draft = { method: 'duration', sleepType: 'nap', feeling: null, endDay: '2026-11-10', hours: '1', minutes: '23' };
  const created = await repository.mutate('create-nap', { kind: 'create-session', draft });
  const original = (await repository.getSession(created.recordId)).data;
  let refreshes = 0;
  repository.subscribe(() => refreshes++);
  repository.setNextFault('unknown-after');
  const update = {
    kind: 'update-session', id: original.id, revision: original.revision,
    draft: { ...draft, minutes: '24', feeling: 'normal' },
  };
  assert.deepEqual(await repository.mutate('uncertain-update', update), { kind: 'unknown', attemptId: 'uncertain-update' });
  assert.deepEqual((await repository.getSession(original.id)).data, original);
  assert.equal(refreshes, 0);
  assert.equal((await repository.reconcile('uncertain-update')).kind, 'confirmed');
  const updated = (await repository.getSession(original.id)).data;
  assert.equal(updated.revision, original.revision + 1);
  assert.equal(updated.minutes, 84);
  assert.equal(updated.feeling, 'normal');
  assert.equal(refreshes, 1);
});

test('picker calendar preserves civil leap dates and pads the month from Monday', () => {
  const { calendarMonthDays } = require('../src/features/sleep/utils/sleep-calendar.ts');
  const days = calendarMonthDays('2024-02-15');
  assert.deepEqual(days.slice(0, 4), [null, null, null, '2024-02-01']);
  assert.deepEqual(days.filter(Boolean).slice(-2), ['2024-02-28', '2024-02-29']);
  assert.equal(days.length % 7, 0);
  assert.equal(calendarMonthDays('2026-02-01').filter(Boolean).length, 28);
  assert.equal(calendarMonthDays('0001-01-01').find(Boolean), '0001-01-01');
  assert.equal(calendarMonthDays('9999-12-01').filter(Boolean).at(-1), '9999-12-31');
});
