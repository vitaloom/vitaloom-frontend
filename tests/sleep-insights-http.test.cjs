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

const { HttpSleepRepository } = require('../src/features/sleep/api/http-sleep-repository.ts');

const period = { start: '2026-11-08', end: '2026-11-14', timeZone: 'Asia/Ho_Chi_Minh' };
const item = (status, overrides = {}) => ({
  code: 'B01', category: 'B', status, title: 'Feeling Distribution', locked: status !== 'READY',
  summary: 'Rated Main Sleep distribution.', sample: { ratedMain: 3, mainWithoutFeeling: 1 },
  evidence: { comfortable: { count: 1, percent: 33 } }, sourceRefs: ['session-1'],
  limitations: ['Self-reported feeling.'], policyVersion: 'policy-1', evidenceVersion: 'evidence-1',
  ...overrides,
});
const detail = (status = 'READY') => ({
  code: 'B01', category: 'B', status, period, title: 'Feeling Distribution',
  summary: 'Rated Main Sleep distribution.', sample: { ratedMain: 3, mainWithoutFeeling: 1 },
  evidence: { comfortable: { count: 1, percent: 33 } }, sourceRefs: ['session-1'],
  limitations: ['Self-reported feeling.'], policyVersion: 'policy-1', evidenceVersion: 'evidence-1',
});

function repositoryFor(responses) {
  const requests = [];
  const repository = new HttpSleepRepository(async (path, init, authenticated) => {
    requests.push({ path, init, authenticated });
    const value = responses.shift();
    if (value instanceof Error) throw value;
    return value;
  });
  return { repository, requests };
}

test('All Insights reads supported A/B items from the parameterless endpoint', async () => {
  const payload = { period, items: [item('READY', { code: 'A01', category: 'A', locked: false }), item('INSUFFICIENT_DATA')] };
  const { repository, requests } = repositoryFor([payload]);
  assert.deepEqual(await repository.getAllInsights(), { kind: 'ready', data: payload });
  assert.equal(requests[0].path, '/sleep/insights');
  assert.equal(requests[0].init.method, 'GET');
  assert.equal(requests[0].authenticated, true);
});

test('All Insights preserves locked status-only entries for every non-ready status', async () => {
  const payload = { period, items: ['INSUFFICIENT_DATA', 'NO_DATA', 'UNVERIFIED_DATA'].map((status) =>
    item(status, { locked: true, summary: undefined, sample: undefined, evidence: undefined, sourceRefs: undefined })) };
  const { repository } = repositoryFor([payload]);
  const result = await repository.getAllInsights();
  assert.deepEqual(result, { kind: 'ready', data: payload });
  assert.deepEqual(result.data.items.map(({ status }) => status), ['INSUFFICIENT_DATA', 'NO_DATA', 'UNVERIFIED_DATA']);
});

test('Insight Detail reads the selected code without query parameters and retains missing-feeling sample data', async () => {
  const payload = detail();
  const { repository, requests } = repositoryFor([payload]);
  assert.deepEqual(await repository.getInsightDetail('B01'), { kind: 'ready', data: payload });
  assert.equal(requests[0].path, '/sleep/insights/B01');
  assert.equal(requests[0].authenticated, true);
  assert.equal(payload.sample.mainWithoutFeeling, 1);
});

test('a fresh detail read observes the latest server evidence for the same code', async () => {
  const updated = { ...detail(), evidenceVersion: 'evidence-2', evidence: { tired: { count: 2, percent: 67 } } };
  const { repository, requests } = repositoryFor([detail(), updated]);
  await repository.getInsightDetail('B01');
  const refreshed = await repository.getInsightDetail('B01');
  assert.equal(refreshed.data.evidenceVersion, 'evidence-2');
  assert.equal(requests.length, 2);
  assert.equal(requests[0].path, requests[1].path);
});

test('invalid insight status and malformed detail responses become read errors', async () => {
  const { repository } = repositoryFor([{ period, items: [item('READY', { status: 'UNKNOWN' })] }, { ...detail(), code: 'A01' }]);
  assert.equal((await repository.getAllInsights()).kind, 'error');
  assert.equal((await repository.getInsightDetail('B01')).kind, 'error');
});
