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

const { localDateFromInstant, getMondayOfWeek, getSevenDatesFromMonday, parseLocalDate } = require('../src/features/water/utils/water-date.ts');
const { validateWaterAmount, validateCreateWaterLogInput } = require('../src/features/water/utils/water-validation.ts');
const { MockWaterRepository } = require('../src/features/water/mocks/mock-water.repository.ts');

test('local calendar dates and Monday week handle Sunday and year boundary', () => {
  assert.equal(getMondayOfWeek('2026-11-08'), '2026-11-02');
  assert.deepEqual(getSevenDatesFromMonday('2026-12-28'), [
    '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31',
    '2027-01-01', '2027-01-02', '2027-01-03',
  ]);
  assert.equal(parseLocalDate('2026-02-30'), null);
  const local = new Date(2026, 10, 5, 0, 1);
  assert.equal(localDateFromInstant(local), '2026-11-05');
});

test('amount and timestamp validation rejects invalid and future logs', () => {
  for (const amount of [0, -1, 1.5, 2001, NaN]) assert.ok(validateWaterAmount(amount));
  for (const amount of [1, 2000]) assert.equal(validateWaterAmount(amount), null);
  const now = new Date('2026-11-05T10:00:00.000Z');
  assert.ok(validateCreateWaterLogInput({ amountMl: 250, loggedAt: '2026-11-05T10:00:01.000Z', source: 'custom' }, now));
  assert.ok(validateCreateWaterLogInput({ amountMl: 250, loggedAt: 'bad', source: 'custom' }, now));
});

test('repository derives today and week from one log source; past entry stays in past', async () => {
  const now = new Date();
  const repo = new MockWaterRepository(now);
  const today = localDateFromInstant(now);
  const before = await repo.getDailySummary(today);
  assert.equal(before.totalMl, 1500);
  assert.equal(before.percent, 75);
  assert.equal(before.logs.length, 4);
  let updates = 0;
  const unsubscribe = repo.subscribe(() => { updates += 1; });
  const addedAt = new Date().toISOString();
  await repo.createLog({ amountMl: 750, loggedAt: addedAt, source: 'quick-add' });
  const after = await repo.getDailySummary(today);
  assert.equal(after.totalMl, 2250);
  assert.equal(after.percent, 113);
  assert.equal(after.logs[0].amountMl, 750);
  assert.equal(updates, 1);
  const yesterdayAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 8, 0).toISOString();
  await repo.createLog({ amountMl: 300, loggedAt: yesterdayAt, source: 'custom' });
  assert.equal((await repo.getDailySummary(today)).totalMl, 2250);
  const monday = getMondayOfWeek(today);
  const week = await repo.getWeeklySummary(monday);
  assert.equal(week.days.length, 7);
  assert.equal(week.days.find((day) => day.date === today).totalMl, 2250);
  unsubscribe();
});

test('repository rejects future and invalid amounts without emitting', async () => {
  const repo = new MockWaterRepository(new Date(), []);
  let updates = 0;
  repo.subscribe(() => { updates += 1; });
  await assert.rejects(repo.createLog({ amountMl: 0, loggedAt: new Date().toISOString(), source: 'custom' }));
  await assert.rejects(repo.createLog({ amountMl: 100, loggedAt: new Date(Date.now() + 60_000).toISOString(), source: 'custom' }));
  assert.equal(updates, 0);
});
