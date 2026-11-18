const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText, filename);
};

const { createTurnId, sampleQuestion, sendSampleTurn } = require('../src/features/assistant/assistant-api.ts');
const { courseApi } = require('../src/features/assistant/assistant-course-api.ts');
const client = require('../src/lib/api/http-client.ts');

test('Assistant authenticates and preserves the exact fixture and turn ID across JWT refresh', async (t) => {
  const turnId = createTurnId();
  const requests = [];
  client.resetApiSession();
  client.setAccessToken('old-test-token');
  client.setRefreshHandler(async () => {
    client.setAccessToken('fresh-test-token');
    return 'fresh-test-token';
  });
  t.after(() => { client.resetApiSession(); client.setRefreshHandler(null); });
  t.mock.method(globalThis, 'fetch', async (path, init) => {
    requests.push({ path, body: JSON.parse(init.body), auth: init.headers.get('Authorization') });
    return requests.length === 1 ? new Response('{}', { status: 401 }) : Response.json({
      turnId, outcome: 'ANSWERED', answer: 'Mở mục Giấc ngủ rồi chọn Nhật ký.',
      citations: [{ id: 'app-help-sleep-journal', version: 1, route: '/sleep/journal' }],
    });
  });

  const reply = await sendSampleTurn(turnId, client.getApiSessionGeneration(), new AbortController().signal);
  assert.equal(reply.hasJournalSource, true);
  assert.deepEqual(requests.map((request) => request.auth), ['Bearer old-test-token', 'Bearer fresh-test-token']);
  for (const request of requests) {
    assert.match(request.path, /\/api\/assistant\/chat$/);
    assert.deepEqual(request.body, { turnId, text: sampleQuestion, consentAccepted: true });
  }
});

test('Assistant rejects a reply for a different turn or a fabricated source', async (t) => {
  const turnId = createTurnId();
  let sentTurn = createTurnId();
  t.mock.method(globalThis, 'fetch', async () => Response.json({
    turnId: sentTurn, outcome: 'ANSWERED', answer: 'Sample',
    citations: [{ id: 'app-help-sleep-journal', version: 1, route: '/untrusted' }],
  }));
  const send = () => sendSampleTurn(turnId, client.getApiSessionGeneration(), new AbortController().signal);
  await assert.rejects(send, /Invalid Assistant response/);
  sentTurn = turnId;
  await assert.rejects(send, /Missing Assistant answer or citation/);
});

test('Composer sends Gemini acknowledgement only on the opted-in request', async (t) => {
  const first = createTurnId();
  const second = createTurnId();
  const requests = [];
  client.resetApiSession();
  client.setAccessToken('synthetic-test-token');
  t.after(() => client.resetApiSession());
  t.mock.method(globalThis, 'fetch', async (path, init) => {
    assert.match(path, /\/api\/assistant\/mvp\/conversations\/demo\/turns$/);
    assert.equal(init.headers.get('Authorization'), 'Bearer synthetic-test-token');
    requests.push(JSON.parse(init.body));
    return Response.json({ id: 'demo', turns: [] });
  });

  const api = courseApi(client.getApiSessionGeneration(), new AbortController().signal);
  await api.send('demo', sampleQuestion, first);
  await api.send('demo', sampleQuestion, second, true);
  assert.deepEqual(requests, [
    { text: sampleQuestion, turnId: first },
    { text: sampleQuestion, turnId: second, geminiAccepted: true },
  ]);
});

test('Vita AI account access loads and saves through the authenticated settings API', async (t) => {
  const requests = [];
  client.resetApiSession();
  client.setAccessToken('synthetic-settings-token');
  t.after(() => client.resetApiSession());
  t.mock.method(globalThis, 'fetch', async (path, init) => {
    requests.push({ path, method: init.method, body: init.body, auth: init.headers.get('Authorization') });
    return Response.json({ personalDataAllowed: requests.length === 1 ? false : true });
  });

  const api = require('../src/features/assistant/assistant-course-api.ts')
    .assistantSettingsApi(client.getApiSessionGeneration(), new AbortController().signal);
  assert.deepEqual(await api.get(), { personalDataAllowed: false });
  assert.deepEqual(await api.update(true), { personalDataAllowed: true });
  assert.deepEqual(requests, [
    { path: '/api/assistant/mvp/settings', method: 'GET', body: undefined, auth: 'Bearer synthetic-settings-token' },
    { path: '/api/assistant/mvp/settings', method: 'PUT', body: JSON.stringify({ personalDataAllowed: true }),
      auth: 'Bearer synthetic-settings-token' },
  ]);
});

test('Vita AI account access rejects a malformed settings response', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ personalDataAllowed: 'yes' }));
  const api = require('../src/features/assistant/assistant-course-api.ts')
    .assistantSettingsApi(client.getApiSessionGeneration(), new AbortController().signal);
  await assert.rejects(api.get(), /Invalid Assistant account settings/);
});

test('Voice upload preserves authentication and lets fetch supply the multipart boundary', async (t) => {
  const turnId = createTurnId();
  const audio = new Blob([Uint8Array.of(1, 79, 255)], { type: 'audio/mp4' });
  client.resetApiSession();
  client.setAccessToken('synthetic-voice-token');
  t.after(() => client.resetApiSession());
  t.mock.method(globalThis, 'fetch', async (path, init) => {
    assert.match(path, /\/api\/assistant\/mvp\/voice-turns$/);
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.get('Authorization'), 'Bearer synthetic-voice-token');
    assert.equal(init.headers.has('Content-Type'), false);
    assert.ok(init.body instanceof FormData);
    assert.equal(init.body.get('turnId'), turnId);
    assert.equal(init.body.get('consentAccepted'), 'true');
    assert.equal(init.body.get('consentVersion'), 'assemblyai-us-v1');
    const encoded = new Request('http://localhost/api/assistant/mvp/voice-turns', init);
    assert.match(encoded.headers.get('Content-Type'), /^multipart\/form-data; boundary=/);
    const file = (await encoded.formData()).get('audio');
    assert.equal(file.name, 'recording.m4a');
    assert.equal(file.type, 'audio/mp4');
    assert.deepEqual(new Uint8Array(await file.arrayBuffer()), Uint8Array.of(1, 79, 255));
    return Response.json({ id: 'voice-conversation', turns: [] });
  });

  const api = courseApi(client.getApiSessionGeneration(), new AbortController().signal);
  const conversation = await api.voiceTurn(audio, turnId);
  assert.equal(conversation.id, 'voice-conversation');
});

test('Expo native multipart accepts a byte-readable file and rejects a URI-only part', async () => {
  const expoDirectory = path.dirname(require.resolve('expo/package.json'));
  const { convertFormDataAsync } = require(path.join(expoDirectory, 'src/winter/fetch/convertFormData.ts'));
  const file = { name: 'recording.m4a', type: 'audio/mp4' };
  const formWith = (value) => ({ entries: () => [['audio', value]] });
  await assert.rejects(convertFormDataAsync(formWith({ ...file, uri: 'file:///voice.m4a' })),
    /Unsupported FormDataPart implementation/);
  const source = Uint8Array.of(1, 79, 255);
  const { body, boundary } = await convertFormDataAsync(formWith({ ...file, bytes: async () => source }));
  const decoded = await new Response(body, {
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
  }).formData();
  assert.equal(decoded.get('audio').name, file.name);
  assert.equal(decoded.get('audio').type, file.type);
  assert.deepEqual(new Uint8Array(await decoded.get('audio').arrayBuffer()), source);
});
