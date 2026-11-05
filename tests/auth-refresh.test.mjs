import test from 'node:test';
import assert from 'node:assert/strict';
import { createSingleFlight, retryAfterUnauthorized } from '../src/lib/api/single-flight.ts';
import { createSerializedAuthStorage } from '../src/lib/storage/serialized-auth-storage.ts';

test('shares one active refresh result between concurrent callers', async () => {
  let calls = 0;
  let finish;
  const refresh = createSingleFlight(async () => {
    calls += 1;
    return await new Promise((resolve) => { finish = resolve; });
  });

  const first = refresh();
  const second = refresh();
  assert.equal(calls, 1);
  finish('new-access');
  assert.deepEqual(await Promise.all([first, second]), ['new-access', 'new-access']);
});

test('allows a later refresh after the active refresh fails', async () => {
  let calls = 0;
  const refresh = createSingleFlight(async () => {
    calls += 1;
    if (calls === 1) throw new Error('temporary failure');
    return 'recovered';
  });
  await assert.rejects(refresh(), /temporary failure/);
  assert.equal(await refresh(), 'recovered');
  assert.equal(calls, 2);
});

test('retries an unauthorized request exactly once after refresh', async () => {
  let sends = 0;
  let refreshes = 0;
  const response = await retryAfterUnauthorized(async (token) => {
    sends += 1;
    if (sends === 1) throw Object.assign(new Error('unauthorized'), { status: 401 });
    assert.equal(token, 'fresh-token');
    return 'ok';
  }, 'old-token', () => true, () => 'old-token', async () => { refreshes += 1; return 'fresh-token'; });
  assert.equal(response, 'ok');
  assert.equal(sends, 2);
  assert.equal(refreshes, 1);
});

test('reuses a newer access token for a staggered 401 without refreshing again', async () => {
  let sends = 0;
  let refreshes = 0;
  let currentToken = 'fresh-token';
  const result = await retryAfterUnauthorized(async (token) => {
    sends += 1;
    if (sends === 1) throw Object.assign(new Error('unauthorized'), { status: 401 });
    assert.equal(token, 'fresh-token');
    return 'ok';
  }, 'old-token', () => true, () => currentToken, async () => { refreshes += 1; return 'unneeded'; });
  assert.equal(result, 'ok');
  assert.equal(sends, 2);
  assert.equal(refreshes, 0);
  currentToken = 'later-token';
});

test('sign-out clear waits for an in-flight refresh-token save', async () => {
  let value = null;
  let startSave;
  let finishSave;
  const saveStarted = new Promise((resolve) => { startSave = resolve; });
  const saveGate = new Promise((resolve) => { finishSave = resolve; });
  const storage = createSerializedAuthStorage({
    getItemAsync: async () => value,
    setItemAsync: async (_key, token) => { startSave(); await saveGate; value = token; },
    deleteItemAsync: async () => { value = null; },
  }, 'refresh');

  const save = storage.saveRefreshToken('new-refresh');
  await saveStarted;
  const clear = storage.clear();
  finishSave();
  await Promise.all([save, clear]);
  assert.equal(value, null);
  assert.equal(await storage.getRefreshToken(), null);
});
