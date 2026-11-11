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

test('weekly mean BPM weights accepted samples and preserves gaps', () => {
  const { meanHeartRate } = require('../src/features/statistics/data/statistics-data.ts');
  assert.equal(meanHeartRate([
    { avgBpm: 60, sampleCount: 3 },
    { avgBpm: null, sampleCount: 0 },
    { avgBpm: 100, sampleCount: 1 },
  ]), 70);
  assert.equal(meanHeartRate([{ avgBpm: null, sampleCount: 0 }]), null);
});

test('weekly water average uses recorded days and excludes future days', () => {
  const { weeklyWater } = require('../src/features/statistics/data/statistics-data.ts');
  assert.deepEqual(weeklyWater([
    { date: '2026-11-09', totalMl: 1000 },
    { date: '2026-11-10', totalMl: 0 },
    { date: '2026-11-11', totalMl: 2000 },
    { date: '2026-11-12', totalMl: 0 },
    { date: '2026-11-13', totalMl: 3000 },
  ], '2026-11-12'), { value: 1500, trend: [1000, null, 2000, null, null], partial: true });
});

test('week navigation reaches the current Monday and rejects future scope', () => {
  const { makePeriod, movePeriod } = require('../src/features/statistics/data/statistics-period.ts');
  const today = '2026-11-12';
  const previous = makePeriod('week', '2026-11-02', today);
  assert.equal(movePeriod(previous, 1), '2026-11-09');
  const current = makePeriod('week', today, today);
  assert.equal(current.end, '2026-11-15');
  assert.equal(movePeriod(current, 1), '2026-11-09');
  assert.equal(movePeriod(makePeriod('day', today, today), 1), today);
});
