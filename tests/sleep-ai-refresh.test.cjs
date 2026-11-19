const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
  }).outputText, filename);
};
const { requestSleepAi, pendingSleepAi } = require('../src/features/sleep/api/sleep-ai-requests.ts');
const ready = { kind: 'ready', data: { status: 'STORY' } };
function repository() {
  let day = '2026-11-16';
  const listeners = new Set();
  return {
    getContext: () => ({ today: day }),
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    change: () => listeners.forEach((listener) => listener()),
    nextDay: () => { day = '2026-11-17'; },
  };
}
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test('navigation can rejoin pending AI; completion is not a client cache or an automatic retry', async () => {
  const repo = repository();
  const work = deferred();
  let calls = 0;
  const read = () => { calls++; return work.promise; };
  const first = requestSleepAi(repo, 'story:window', read);
  assert.equal(pendingSleepAi(repo, 'story:window'), first);
  assert.equal(requestSleepAi(repo, 'story:window', read), first);
  await Promise.resolve();
  assert.equal(calls, 1);
  work.resolve(ready);
  assert.equal(await first, ready);
  assert.equal(pendingSleepAi(repo, 'story:window'), undefined);
  await new Promise((done) => setImmediate(done));
  assert.equal(calls, 1);
});

test('Explanation lookup on focus does not start work; only explicit request does', async () => {
  const repo = repository();
  assert.equal(pendingSleepAi(repo, 'explanation:B01:v1'), undefined);
  const work = deferred();
  const response = requestSleepAi(repo, 'explanation:B01:v1', () => work.promise);
  assert.equal(pendingSleepAi(repo, 'explanation:B01:v1'), response);
  assert.equal(pendingSleepAi(repo, 'explanation:A01:v1'), undefined);
  assert.equal(pendingSleepAi(repo, 'explanation:B01:v2'), undefined);
  work.resolve(ready);
  await response;
});

test('account repositories never share pending work, including a new session for the same account', async () => {
  const a = repository(), b = repository();
  const work = deferred();
  const response = requestSleepAi(a, 'story:same', () => work.promise);
  assert.equal(pendingSleepAi(b, 'story:same'), undefined);
  assert.equal(pendingSleepAi(repository(), 'story:same'), undefined);
  work.resolve(ready);
  await response;
});

test('Journal, Goal, zone or consent invalidation rejects old output without cancelling eligible work', async () => {
  const repo = repository();
  const old = deferred(), current = deferred();
  const first = requestSleepAi(repo, 'story:same-summary', () => old.promise);
  repo.change();
  assert.equal(pendingSleepAi(repo, 'story:same-summary'), undefined);
  const second = requestSleepAi(repo, 'story:same-summary', () => current.promise);
  old.resolve(ready);
  assert.equal((await first).code, 'STALE');
  assert.equal(pendingSleepAi(repo, 'story:same-summary'), second);
  current.resolve(ready);
  assert.equal(await second, ready);
});

test('D to D+1 cannot reuse or publish yesterday pending AI', async () => {
  const repo = repository();
  const work = deferred();
  const response = requestSleepAi(repo, 'story', () => work.promise);
  repo.nextDay();
  assert.equal(pendingSleepAi(repo, 'story'), undefined);
  work.resolve(ready);
  assert.equal((await response).code, 'STALE');
});

test('failure settles and never schedules another call', async () => {
  const repo = repository();
  let calls = 0;
  const result = await requestSleepAi(repo, 'story', () => { calls++; throw new Error('offline'); });
  assert.equal(result.kind, 'error');
  await new Promise((done) => setImmediate(done));
  assert.equal(calls, 1);
  assert.equal(pendingSleepAi(repo, 'story'), undefined);
});

// Exercise the read hook's event wiring with controlled focus and deferred HTTP
// replies. No timers, network fixtures or source-text assertions are involved.
function readHarness(initialRepository, read, platform = 'android') {
  let repo = initialRepository, cursor = 0, slots = [], effects = [], focus, cleanup;
  let appListener;
  const same = (a, b) => a && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useState(value) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = value;
      return [slots[i], (next) => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }];
    },
    useCallback(callback, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) slots[i] = { callback, deps };
      return slots[i].callback;
    },
    useEffect(callback, deps) {
      const i = cursor++;
      if (!same(slots[i], deps)) { slots[i] = deps; effects.push(callback); }
    },
  };
  const module = { exports: {} };
  const filename = require.resolve('../src/features/sleep/hooks/use-sleep.ts');
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'module', 'exports', source)((name) => {
    if (name === 'react') return react;
    if (name === 'expo') return { uuid: {} };
    if (name === 'expo-router') return { useFocusEffect: (callback) => {
      if (focus !== callback) { cleanup?.(); focus = callback; effects.push(() => { cleanup = focus(); }); }
    } };
    if (name === 'react-native') return { Platform: { OS: platform }, AppState: {
      addEventListener: (_, listener) => { appListener = listener; return { remove() { appListener = undefined; } }; },
    } };
    if (name.includes('auth-context')) return { useAuth: () => ({ user: { id: 'synthetic' } }) };
    if (name.includes('get-sleep-repository')) return { getSleepRepository: () => repo };
    throw new Error(name);
  }, module, module.exports);
  return {
    render() { cursor = 0; const result = module.exports.useSleepRead(read, 'evidence', false, true);
      const pending = effects; effects = []; pending.forEach((effect) => effect()); return result.state; },
    blur() { cleanup?.(); },
    focus() { cleanup = focus(); },
    resume() { appListener('active'); },
    account(next) { repo = next; },
  };
}
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

test('focus and app resume refresh evidence, discard blur replies, and never poll', async () => {
  const repo = repository();
  const work = [];
  const view = readHarness(repo, () => { const next = deferred(); work.push(next); return next.promise; });
  view.render(); await flush();
  assert.equal(work.length, 1);
  work[0].resolve({ kind: 'ready', data: 'first' }); await flush();
  assert.equal(view.render().data, 'first');
  view.resume(); await flush();
  assert.equal(view.render().kind, 'loading');
  view.blur();
  work[1].resolve({ kind: 'ready', data: 'obsolete' }); await flush();
  assert.equal(view.render().kind, 'loading');
  view.focus(); await flush();
  work[2].resolve({ kind: 'ready', data: 'fresh' }); await flush();
  assert.equal(view.render().data, 'fresh');
  await new Promise((done) => setImmediate(done));
  assert.equal(work.length, 3);
  view.blur();
});

test('evidence mutation, account switch and midnight discard obsolete read generations', async () => {
  const repo = repository(), other = repository();
  const work = [];
  const view = readHarness(repo, () => { const next = deferred(); work.push(next); return next.promise; });
  view.render(); await flush();
  repo.change(); await flush();
  work[0].resolve({ kind: 'ready', data: 'old evidence' }); await flush();
  assert.equal(view.render().kind, 'loading');
  view.account(other); view.render(); await flush();
  work[1].resolve({ kind: 'ready', data: 'old account' }); await flush();
  assert.equal(view.render().kind, 'loading');
  other.nextDay();
  work[2].resolve({ kind: 'ready', data: 'yesterday' }); await flush();
  assert.equal(view.render().kind, 'loading'); await flush();
  work.at(-1).resolve({ kind: 'ready', data: 'today' }); await flush();
  assert.equal(view.render().data, 'today');
  view.blur();
});

test('web visibility and window focus refresh, hide old output, and remove listeners on route blur', async () => {
  const oldDocument = global.document, oldWindow = global.window;
  const documentListeners = new Map(), windowListeners = new Map();
  const events = (listeners) => ({
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: (name) => listeners.delete(name),
  });
  global.document = { visibilityState: 'visible', ...events(documentListeners) };
  global.window = events(windowListeners);
  let calls = 0;
  const view = readHarness(repository(), async () => ({ kind: 'ready', data: ++calls }), 'web');
  try {
    view.render(); await flush();
    assert.equal(view.render().data, 1);
    windowListeners.get('blur')();
    assert.equal(view.render().kind, 'loading');
    windowListeners.get('focus')(); await flush();
    assert.equal(view.render().data, 2);
    global.document.visibilityState = 'hidden'; documentListeners.get('visibilitychange')();
    assert.equal(view.render().kind, 'loading');
    global.document.visibilityState = 'visible'; documentListeners.get('visibilitychange')(); await flush();
    assert.equal(view.render().data, 3);
    view.resume(); await flush();
    assert.equal(calls, 3);
    view.blur();
    assert.equal(documentListeners.size, 0);
    assert.equal(windowListeners.size, 0);
  } finally {
    view.blur();
    global.document = oldDocument; global.window = oldWindow;
  }
});
