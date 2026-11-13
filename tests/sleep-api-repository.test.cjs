const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

const { HttpSleepRepository } = require('../src/features/sleep/api/http-sleep-repository.ts');
const { ApiError } = require('../src/lib/api/http-client.ts');

const durationDto = (overrides = {}) => ({
  id: 'session-1', confirmedAt: '2026-11-12T08:00:00Z',
  sleepType: 'NAP', editable: false,
  method: 'DURATION', feeling: null, day: '2026-11-12', minutes: 25,
  ...overrides,
});

function fixedRepository(request, timeout) {
  const repository = new HttpSleepRepository(request, timeout);
  repository.getContext = () => ({ today: '2026-11-13', timeZone: 'Asia/Ho_Chi_Minh' });
  return repository;
}

function fakeRequester(responses) {
  const requests = [];
  const request = async (path, init = {}, authenticated = false) => {
    requests.push({ path, init, authenticated });
    const response = responses.shift();
    if (response instanceof Error) throw response;
    return typeof response === 'function' ? response(path, init) : response;
  };
  request.requests = requests;
  return request;
}

test('GET Journal sends only inclusive day bounds and maps a verified empty response', async () => {
  const request = fakeRequester([{ sessions: [] }]);
  const repository = fixedRepository(request);
  assert.deepEqual(await repository.getJournal({ from: '2026-11-01', to: '2026-11-13', limit: 20, cursor: 'ignored' }), {
    kind: 'ready',
    data: { sessions: [], verified: true, nextCursor: null, version: 'server' },
  });
  assert.equal(request.requests[0].path, '/sleep/v2/sessions?from=2026-11-01&to=2026-11-13');
  assert.equal(request.requests[0].authenticated, true);
});

test('Journal maps duration and range meanings without requiring API revisions', async () => {
  const range = {
    id: 'range-1', confirmedAt: '2026-11-12T08:00:00Z', sleepType: 'MAIN', editable: true, method: 'RANGE',
    feeling: 'COMFORTABLE', day: '2026-11-12', minutes: 60, timeZone: 'UTC',
    start: { day: '2026-11-12', hour: '01', minute: '00' },
    end: { day: '2026-11-12', hour: '02', minute: '00' },
    startAt: '2026-11-12T01:00:00Z', endAt: '2026-11-12T02:00:00Z',
  };
  const repository = fixedRepository(fakeRequester([{ sessions: [durationDto(), range] }]));
  const result = await repository.getJournal();
  assert.equal(result.kind, 'ready');
  assert.equal(result.data.sessions[0].method, 'duration');
  assert.equal(result.data.sessions[0].sleepType, 'nap');
  assert.equal(result.data.sessions[0].editable, false);
  assert.equal(result.data.sessions[0].revision, 1);
  assert.equal(result.data.sessions[0].minutes, 25);
  assert.equal(result.data.sessions[1].method, 'range');
  assert.equal(result.data.sessions[1].timeZone, 'UTC');
  assert.equal(result.data.sessions[1].feeling, 'comfortable');
});

test('Journal failures and unsupported source filters are never reported as empty data', async () => {
  const failure = new ApiError(503, 'SLEEP_UNAVAILABLE', 'Service unavailable');
  const repository = fixedRepository(fakeRequester([failure]));
  assert.deepEqual(await repository.getJournal(), {
    kind: 'error', message: 'Service unavailable', code: 'SLEEP_UNAVAILABLE',
  });
  assert.equal((await repository.getJournal({ sourceIds: ['source-1'] })).kind, 'error');
});

test('Detail maps only the server missing-record error to verified absence', async () => {
  const missing = new ApiError(404, 'SLEEP_NOT_FOUND', 'not found');
  assert.deepEqual(await fixedRepository(fakeRequester([missing])).getSession('gone'),
    { kind: 'ready', data: null });
  const auth = new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
  assert.equal((await fixedRepository(fakeRequester([auth])).getSession('private')).kind, 'error');
});

test('Home keeps unavailable totals and goals unverified', async () => {
  const recordedMain = durationDto({ sleepType: 'MAIN', editable: true });
  const repository = fixedRepository(fakeRequester([{ sessions: [recordedMain] }, { sessions: [recordedMain] }]));
  const result = await repository.getHome();
  assert.equal(result.kind, 'ready');
  assert.equal(result.data.latest.id, 'session-1');
  assert.equal(result.data.latest.editable, true);
  assert.equal(result.data.daily.status, 'no-data');
  assert.equal(result.data.daily.minutes, null);
  assert.equal(result.data.daily.goal.verified, false);
  assert.equal(result.data.featured, null);
  assert.equal((await repository.getGoal()).kind, 'error');
  assert.equal((await repository.getDaily('2026-11-12')).data.status, 'recorded');
});

test('POST and PUT send validated DTOs and publish only returned sessions', async () => {
  const request = fakeRequester([
    durationDto({ id: 'created', sleepType: 'MAIN', method: 'DURATION', feeling: 'TIRED' }),
    durationDto({ id: 'updated', sleepType: 'MAIN', method: 'DURATION' }),
  ]);
  const repository = fixedRepository(request);
  let notifications = 0;
  repository.subscribe(() => notifications++);

  const draft = {
    method: 'duration', sleepType: 'nap', feeling: 'tired',
    endDay: '2026-11-12', hours: '0', minutes: '25',
  };
  assert.equal((await repository.mutate('unused-attempt', { kind: 'create-session', draft })).kind, 'confirmed');
  assert.equal((await repository.mutate('unused-update-attempt', {
    kind: 'update-session', id: 'session-1', revision: 999, confirmedAt: '2026-11-12T08:00:00Z', draft,
  })).kind, 'confirmed');

  assert.equal(request.requests[0].path, '/sleep/v2/sessions');
  assert.equal(request.requests[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(request.requests[0].init.body), {
    sleepType: 'MAIN', method: 'DURATION', feeling: 'TIRED', endDay: '2026-11-12', minutes: 25,
  });
  assert.equal(request.requests[1].path, '/sleep/v2/sessions/session-1');
  assert.equal(request.requests[1].init.method, 'PUT');
  assert.equal(request.requests[1].init.headers.get('If-Match'), '"2026-11-12T08:00:00Z"');
  assert.equal(request.requests[1].init.headers.get('Idempotency-Key'), null);
  assert.equal(notifications, 2);
});

test('DELETE uses the existing session route, confirms 204, and notifies readers', async () => {
  const request = fakeRequester([undefined]);
  const repository = fixedRepository(request);
  let notifications = 0;
  repository.subscribe(() => notifications++);
  const result = await repository.mutate('ignored', { kind: 'delete-session', id: 'session-1', revision: 4, confirmedAt: '2026-11-12T08:00:00Z' });
  assert.deepEqual(result, { kind: 'confirmed', version: 'server', recordId: 'session-1' });
  assert.equal(request.requests[0].path, '/sleep/v2/sessions/session-1');
  assert.equal(request.requests[0].init.method, 'DELETE');
  assert.equal(request.requests[0].init.headers.get('If-Match'), '"2026-11-12T08:00:00Z"');
  assert.equal(notifications, 1);
});

test('Validation, overlap, not-found, and network failures preserve explicit outcomes', async () => {
  const overlap = new ApiError(409, 'SLEEP_OVERLAP', 'Overlaps');
  const missing = new ApiError(404, 'SLEEP_NOT_FOUND', 'Deleted');
  const network = new ApiError(0, 'NETWORK_ERROR', 'Connection ended');
  const repository = fixedRepository(fakeRequester([overlap, missing, network]));
  const draft = {
    method: 'duration', feeling: null,
    endDay: '2026-11-12', hours: '0', minutes: '25',
  };
  assert.deepEqual(await repository.mutate('attempt-1', { kind: 'create-session', draft }),
    { kind: 'conflict', reason: 'overlap', message: 'Overlaps' });
  assert.deepEqual(await repository.mutate('attempt-2', { kind: 'delete-session', id: 'deleted', revision: 1 }),
    { kind: 'conflict', reason: 'deleted', message: 'Deleted' });
  assert.deepEqual(await repository.mutate('attempt-3', { kind: 'create-session', draft }),
    { kind: 'rejected', message: 'Could not confirm the change. Reload your journal before trying again.' });
});

test('Business conflicts preserve duplicate, locked-week, latest-only, and stale categories', async () => {
  const codes = [
    ['SLEEP_DAY_ALREADY_RECORDED', 'duplicate'],
    ['SLEEP_WEEK_LOCKED', 'week-locked'],
    ['SLEEP_RECORD_NOT_LATEST', 'not-latest'],
    ['SLEEP_STALE', 'stale'],
  ];
  const repository = fixedRepository(fakeRequester(codes.map(([code]) => new ApiError(409, code, code))));
  const draft = { method: 'duration', feeling: null, endDay: repository.getContext().today, hours: '1', minutes: '0' };
  for (const [code, reason] of codes) {
    const result = await repository.mutate(code, { kind: 'create-session', draft });
    assert.deepEqual(result, { kind: 'conflict', reason, message: code });
  }
});

test('Invalid drafts never send and reconciliation reports the unsupported operation', async () => {
  const request = fakeRequester([]);
  const repository = fixedRepository(request);
  const invalid = await repository.mutate('ignored', {
    kind: 'create-session',
    draft: { method: 'duration', feeling: null, endDay: repository.getContext().today, hours: '0', minutes: '0' },
  });
  assert.equal(invalid.kind, 'validation');
  assert.equal(request.requests.length, 0);
  assert.equal((await repository.reconcile('ignored')).kind, 'rejected');
});

test('A request deadline aborts the request and reports a rejected outcome', async () => {
  let signal;
  const request = async (_path, init) => {
    signal = init.signal;
    return new Promise(() => {});
  };
  const repository = fixedRepository(request, 5);
  const result = await repository.mutate('unused', {
    kind: 'create-session',
    draft: { method: 'duration', feeling: null, endDay: '2026-11-12', hours: '0', minutes: '1' },
  });
  assert.equal(result.kind, 'rejected');
  assert.equal(signal.aborted, true);
});
