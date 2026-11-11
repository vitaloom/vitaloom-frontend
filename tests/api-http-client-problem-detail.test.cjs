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

const { ApiError, rawApiRequest } = require('../src/lib/api/http-client.ts');

test('request errors use Problem Details code and detail as ApiError fields', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    type: 'about:blank',
    title: 'Bad Request',
    status: 400,
    detail: 'The request payload is invalid.',
    instance: '/api/auth/login',
    code: 'VALIDATION_ERROR',
  }), { status: 400, headers: { 'Content-Type': 'application/problem+json' } });

  try {
    await assert.rejects(rawApiRequest('/auth/login', { method: 'POST', body: '{}' }), (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 400);
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.equal(error.message, 'The request payload is invalid.');
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('legacy nested errors remain readable and malformed error bodies use safe defaults', async () => {
  const originalFetch = globalThis.fetch;
  const bodies = [
    JSON.stringify({ error: { code: 'LEGACY_ERROR', message: 'Legacy message.' } }),
    'null',
    'not-json',
  ];
  globalThis.fetch = async () => new Response(bodies.shift(), { status: 400 });

  try {
    await assert.rejects(rawApiRequest('/auth/login'), (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, 'LEGACY_ERROR');
      assert.equal(error.message, 'Legacy message.');
      return true;
    });
    for (let i = 0; i < 2; i += 1) {
      await assert.rejects(rawApiRequest('/auth/login'), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.status, 400);
        assert.equal(error.code, 'REQUEST_FAILED');
        assert.equal(error.message, 'Request failed.');
        return true;
      });
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
