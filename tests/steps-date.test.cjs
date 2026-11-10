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

const { dateInHcm, getMonday, isFutureHcmDate, shiftCalendarDate, stepsSeriesPath, weekDates } = require('../src/features/steps/utils/steps-date.ts');

test('uses the Ho Chi Minh date and preserves it across UTC midnight', () => {
  assert.equal(dateInHcm(new Date('2026-11-06T16:59:59.999Z')), '2026-11-06');
  assert.equal(dateInHcm(new Date('2026-11-06T17:00:00.000Z')), '2026-11-07');
});

test('builds Daily, Weekly, and Custom requests using the contract parameters', () => {
  assert.equal(stepsSeriesPath('day', { date: '2026-11-08' }), '/statistics/steps/daily?date=2026-11-08');
  assert.equal(stepsSeriesPath('week', { weekStartDate: '2026-11-02' }), '/statistics/steps/weekly?weekStartDate=2026-11-02');
  assert.equal(stepsSeriesPath('custom', { startDate: '2026-11-01', endDate: '2026-11-08' }), '/statistics/steps/custom?startDate=2026-11-01&endDate=2026-11-08');
});

test('generates Monday-first weeks and date changes without local-time drift', () => {
  assert.equal(getMonday('2026-11-08'), '2026-11-02');
  assert.deepEqual(weekDates('2026-11-08'), ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']);
  assert.equal(shiftCalendarDate('2027-01-01', -1), '2026-12-31');
  assert.equal(isFutureHcmDate('2026-11-09', '2026-11-08'), true);
  assert.equal(isFutureHcmDate('2026-11-08', '2026-11-08'), false);
});
