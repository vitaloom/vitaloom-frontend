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

const { createWebSessionKeyValueStore } = require('../src/lib/storage/web-session-key-value-store.ts');

test('web auth storage reads, writes, and clears values from session storage', async () => {
  const values = new Map();
  const session = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const store = createWebSessionKeyValueStore(() => session);
  assert.equal(await store.getItemAsync('refresh'), null);
  await store.setItemAsync('refresh', 'session-token');
  assert.equal(await store.getItemAsync('refresh'), 'session-token');
  await store.deleteItemAsync('refresh');
  assert.equal(await store.getItemAsync('refresh'), null);
});

test('web auth storage reports unavailable session storage instead of failing on import', async () => {
  const store = createWebSessionKeyValueStore(() => undefined);
  await assert.rejects(store.getItemAsync('refresh'), /session storage is unavailable/);
});
