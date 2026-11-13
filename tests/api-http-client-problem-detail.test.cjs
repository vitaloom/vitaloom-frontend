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

const { ApiError, apiRequest, rawApiRequest, resetApiSession, setAccessToken, setRefreshHandler } = require('../src/lib/api/http-client.ts');

test('an expired request cannot replay a mutation with a new account token', async () => {
  const originalFetch = globalThis.fetch;
  let finish;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Promise(resolve => { finish = resolve; });
  };
  resetApiSession();
  setAccessToken('old-account');
  setRefreshHandler(async () => 'unexpected-token');
  try {
    const result = apiRequest('/sleep/v2/sessions', { method: 'POST', body: '{}' }, true);
    resetApiSession();
    setAccessToken('new-account');
    finish(new Response('{}', { status: 401 }));
    await assert.rejects(result, error => error.code === 'AUTH_SESSION_CHANGED');
    assert.equal(calls, 1);
  } finally {
    resetApiSession();
    setRefreshHandler(null);
    globalThis.fetch = originalFetch;
  }
});

test('a 401 refresh resends the same Sleep update payload', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (_url, init) => {
    requests.push({ headers: Object.fromEntries(init.headers), body: init.body });
    return new Response('{}', { status: requests.length === 1 ? 401 : 200 });
  };
  resetApiSession();
  setAccessToken('expired');
  let refreshes = 0;
  setRefreshHandler(async () => {
    refreshes += 1;
    setAccessToken('fresh');
    return 'fresh';
  });
  try {
    await apiRequest('/sleep/v2/sessions/id', {
      method: 'PUT', body: '{"minutes":1}',
    }, true);
    assert.equal(refreshes, 1);
    assert.equal(requests.length, 2);
    assert.equal(requests[0].headers.authorization, 'Bearer expired');
    assert.equal(requests[1].headers.authorization, 'Bearer fresh');
    for (const request of requests) {
      assert.equal(request.body, '{"minutes":1}');
    }
  } finally {
    resetApiSession();
    setRefreshHandler(null);
    globalThis.fetch = originalFetch;
  }
});

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
