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

const { ApiWaterRepository } = require('../src/features/water/services/api-water.repository.ts');

function response(requests) {
  return async (path, init, authenticated) => {
    requests.push({ path, init, authenticated });
    if (path.includes('daily-summary')) return {
      date: '2026-11-06', goalMl: 2000, totalMl: 2250, percent: 113,
      logs: [
        { id: 'new', amountMl: 250, loggedAt: '2026-11-06T02:00:00Z' },
        { id: 'old', amountMl: 2000, loggedAt: '2026-11-05T20:00:00Z' },
      ],
    };
    if (path.includes('weekly-progress')) return {
      weekStart: '2026-11-02', weekEnd: '2026-11-08',
      days: Array.from({ length: 7 }, (_, i) => ({ date: `2026-11-0${i + 2}`, totalMl: i === 4 ? 250 : 0, goalMl: 2000 })),
    };
    if (init.method === 'POST') return { id: 'created', amountMl: 250, loggedAt: '2026-11-06T02:00:00Z' };
    throw new Error('Unexpected request');
  };
}

test('daily and weekly summaries use authenticated API and preserve server ordering and local timezone', async () => {
  const requests = [];
  const repository = new ApiWaterRepository(response(requests), () => 'Asia/Ho_Chi_Minh');
  const daily = await repository.getDailySummary('2026-11-06');
  assert.equal(daily.totalMl, 2250);
  assert.equal(daily.percent, 113);
  assert.deepEqual(daily.logs.map((log) => log.id), ['new', 'old']);
  assert.equal(daily.logs[0].source, 'custom');
  const weekly = await repository.getWeeklySummary('2026-11-02');
  assert.equal(weekly.days.length, 7);
  assert.equal(weekly.days[6].totalMl, 0);
  assert.equal(requests[0].path, '/water/daily-summary?date=2026-11-06&timeZone=Asia%2FHo_Chi_Minh');
  assert.equal(requests[1].path, '/water/weekly-progress?weekStart=2026-11-02&timeZone=Asia%2FHo_Chi_Minh');
  assert.ok(requests.every((request) => request.authenticated));
});

test('create sends only the API DTO and does not hide server errors', async () => {
  const requests = [];
  const repository = new ApiWaterRepository(response(requests), () => 'UTC');
  const created = await repository.createLog({ amountMl: 250, loggedAt: '2026-11-06T02:00:00Z', source: 'quick-add' });
  assert.equal(created.id, 'created');
  assert.deepEqual(JSON.parse(requests[0].init.body), { amountMl: 250, loggedAt: '2026-11-06T02:00:00Z' });
  assert.equal(requests[0].authenticated, true);
  const failing = new ApiWaterRepository(async () => { throw new Error('server failed'); }, () => 'UTC');
  await assert.rejects(failing.createLog({ amountMl: 250, loggedAt: '2026-11-06T02:00:00Z', source: 'custom' }), /server failed/);
});

test('create leaves the timestamp to the server when the caller selects Now', async () => {
  const requests = [];
  const repository = new ApiWaterRepository(response(requests), () => 'UTC');
  await repository.createLog({ amountMl: 250, source: 'quick-add' });
  assert.deepEqual(JSON.parse(requests[0].init.body), { amountMl: 250 });
});

test('missing device timezone fails clearly rather than selecting another data source', async () => {
  const repository = new ApiWaterRepository(async () => { throw new Error('request should not run'); }, () => null);
  await assert.rejects(repository.getDailySummary('2026-11-06'), /timezone/i);
});
