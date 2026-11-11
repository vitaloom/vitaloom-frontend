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

const { aggregateHeartRateSeries, connectedHeartRateSegments } = require('../src/features/heart-rate/utils/heart-rate-analytics.ts');

function makeSeries(startAt, endAt, intervalMinutes, bucketCount, samples) {
  const start = Date.parse(startAt);
  return {
    startAt,
    endAt,
    timezone: 'Asia/Ho_Chi_Minh',
    intervalMinutes,
    buckets: Array.from({ length: bucketCount }, (_, index) => {
      const sample = samples[index];
      return {
        startAt: new Date(start + index * intervalMinutes * 60_000).toISOString(),
        minBpm: sample?.min ?? null,
        avgBpm: sample?.avg ?? null,
        maxBpm: sample?.max ?? null,
        sampleCount: sample?.count ?? 0,
      };
    }),
  };
}

test('Daily aggregation produces 24 hourly groups and weights source averages by sample count', () => {
  const series = makeSeries('2026-11-05T17:00:00.000Z', '2026-11-06T17:00:00.000Z', 15, 96, {
    0: { min: 55, avg: 60, max: 70, count: 2 },
    1: { min: 75, avg: 80, max: 90, count: 1 },
    4: { min: 90, avg: 100, max: 110, count: 1 },
    12: { min: 65, avg: 70, max: 75, count: 1 },
  });
  const result = aggregateHeartRateSeries(series, 'day');
  assert.equal(result.buckets.length, 24);
  assert.equal(result.buckets[0].sampleCount, 3);
  assert.equal(result.buckets[0].minBpm, 55);
  assert.equal(result.buckets[0].avgBpm, (60 * 2 + 80) / 3);
  assert.equal(result.buckets[0].maxBpm, 90);
  assert.equal(result.buckets[2].avgBpm, null);
  assert.equal(result.sampleCount, 5);
  assert.equal(result.nonemptyBucketCount, 3);
  assert.equal(result.avgBpm, (60 * 2 + 80 + 100 + 70) / 5);
});

test('Weekly and Custom aggregation group hourly source buckets by Ho Chi Minh local date', () => {
  const weekly = makeSeries('2026-11-01T17:00:00.000Z', '2026-11-08T17:00:00.000Z', 60, 168, {
    0: { min: 58, avg: 60, max: 72, count: 2 },
    24: { min: 90, avg: 100, max: 112, count: 1 },
  });
  const week = aggregateHeartRateSeries(weekly, 'week');
  assert.equal(week.buckets.length, 7);
  assert.equal(week.buckets[0].date, '2026-11-02');
  assert.equal(week.buckets[1].date, '2026-11-03');
  assert.equal(week.avgBpm, (60 * 2 + 100) / 3);
  assert.equal(week.minBpm, 58);
  assert.equal(week.maxBpm, 112);

  const custom = makeSeries('2026-11-04T17:00:00.000Z', '2026-11-06T17:00:00.000Z', 60, 48, {
    0: { min: 65, avg: 70, max: 78, count: 3 },
    47: { min: 81, avg: 90, max: 102, count: 1 },
  });
  const range = aggregateHeartRateSeries(custom, 'custom');
  assert.deepEqual(range.buckets.map((bucket) => bucket.date), ['2026-11-05', '2026-11-06']);
  assert.equal(range.sampleCount, 4);
  assert.equal(range.avgBpm, (70 * 3 + 90) / 4);
});

test('connected average segments break at every empty bucket', () => {
  const series = makeSeries('2026-11-05T17:00:00.000Z', '2026-11-06T17:00:00.000Z', 15, 96, {
    0: { min: 55, avg: 60, max: 70, count: 2 },
    4: { min: 90, avg: 100, max: 110, count: 1 },
    12: { min: 65, avg: 70, max: 75, count: 1 },
  });
  const buckets = aggregateHeartRateSeries(series, 'day').buckets;
  assert.deepEqual(connectedHeartRateSegments(buckets).map((segment) => segment.map((bucket) => bucket.date)), [
    ['2026-11-06', '2026-11-06'],
    ['2026-11-06'],
  ]);
});
