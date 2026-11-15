const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const { getSleepRepository } = require('../src/features/sleep/api/get-sleep-repository.ts');
const { MockSleepRepository } = require('../src/features/sleep/mocks/mock-sleep-repository.ts');
const { resetApiSession, setAccessToken } = require('../src/lib/api/http-client.ts');

test('production never uses fixtures or falls back to them after HTTP failure', async () => {
  globalThis.__DEV__ = false;
  process.env.EXPO_PUBLIC_SLEEP_MODE = 'mock';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('disconnected'); };
  try {
    const production = getSleepRepository('account-a');
    assert.ok(!(production instanceof MockSleepRepository));
    assert.equal((await production.getJournal()).kind, 'error');
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.EXPO_PUBLIC_SLEEP_MODE;
    delete globalThis.__DEV__;
  }
});

test('account switches and sign-out retire old repositories and reject stale requests', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ sessions: [] }));
  };
  try {
    resetApiSession();
    setAccessToken('account-a-token');
    const first = getSleepRepository('account-a');
    assert.equal(first, getSleepRepository('account-a'));
    assert.equal((await first.getJournal()).kind, 'ready');
    resetApiSession();
    setAccessToken('account-b-token');
    const second = getSleepRepository('account-b');
    assert.notEqual(first, second);
    assert.equal((await first.getJournal()).kind, 'error');
    assert.equal((await second.getJournal()).kind, 'ready');
    resetApiSession();
    assert.equal((await second.getJournal()).kind, 'error');
    assert.notEqual(first, getSleepRepository('account-a'));
    assert.equal(calls, 2);
  } finally {
    resetApiSession();
    globalThis.fetch = originalFetch;
  }
});

test('explicit development mode preserves the scenario fixtures', async () => {
  resetApiSession();
  globalThis.__DEV__ = true;
  process.env.EXPO_PUBLIC_SLEEP_MODE = 'mock';
  process.env.EXPO_PUBLIC_SLEEP_SCENARIO = 'empty';
  try {
    const repo = getSleepRepository('developer');
    assert.ok(repo instanceof MockSleepRepository);
    const journal = await repo.getJournal();
    assert.equal(journal.kind, 'ready');
    assert.deepEqual(journal.data.sessions, []);
    const recent = await repo.getRecent();
    assert.equal(recent.kind, 'error');
  } finally {
    resetApiSession();
    delete process.env.EXPO_PUBLIC_SLEEP_MODE;
    delete process.env.EXPO_PUBLIC_SLEEP_SCENARIO;
    delete globalThis.__DEV__;
  }
});

test('a Recent response from a prior account session is discarded after account switch', async () => {
  const originalFetch = globalThis.fetch;
  let releaseFirst;
  let firstRequest = true;
  const payload = {
    period: { start: '2026-11-08', end: '2026-11-14', timeZone: 'Asia/Ho_Chi_Minh' },
    dataStatus: 'NO_DATA',
    days: Array.from({ length: 7 }, (_, index) => ({
      day: new Date(Date.UTC(2026, 10, 8 + index)).toISOString().slice(0, 10),
      status: 'NOT_RECORDED', minutes: null,
    })),
    recordedDays: 0, coverageDenominator: 7, averageMinutesPerRecordedDay: null, insights: [],
  };
  globalThis.fetch = () => {
    if (firstRequest) {
      firstRequest = false;
      return new Promise((resolve) => { releaseFirst = resolve; });
    }
    return Promise.resolve(new Response(JSON.stringify(payload)));
  };
  try {
    resetApiSession();
    setAccessToken('account-a-token');
    const accountA = getSleepRepository('account-a');
    const pendingRecent = accountA.getRecent();
    resetApiSession();
    setAccessToken('account-b-token');
    const accountB = getSleepRepository('account-b');
    releaseFirst(new Response(JSON.stringify(payload)));
    assert.deepEqual(await pendingRecent, {
      kind: 'error', message: 'The authenticated account changed.', code: 'AUTH_SESSION_CHANGED',
    });
    assert.equal((await accountB.getRecent()).kind, 'ready');
  } finally {
    resetApiSession();
    globalThis.fetch = originalFetch;
  }
});
