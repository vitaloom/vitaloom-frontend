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

const { dateInHcm, shiftCalendarDate, weekDates, weekRangeLabel, isFutureHcmDate, heartRateSummaryPath, heartRateSeriesPath, getMonday, validateHeartRateRange } = require('../src/features/heart-rate/utils/heart-rate-date.ts');

test('uses the Ho Chi Minh calendar date across UTC midnight boundaries', () => {
  assert.equal(dateInHcm(new Date('2026-11-06T16:59:00.000Z')), '2026-11-06');
  assert.equal(dateInHcm(new Date('2026-11-06T17:00:00.000Z')), '2026-11-07');
});

test('calendar shifts cross month and year boundaries without local-time drift', () => {
  assert.equal(shiftCalendarDate('2027-01-01', -1), '2026-12-31');
  assert.equal(shiftCalendarDate('2026-11-06', -7), '2026-10-30');
});

test('calendar week is Monday through Sunday and includes visible future dates', () => {
  assert.deepEqual(weekDates('2026-11-06'), ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']);
  assert.equal(weekRangeLabel(weekDates('2026-11-06')), '02/11–08/11/2026');
});

test('only dates after the Ho Chi Minh current date are considered future', () => {
  assert.equal(isFutureHcmDate('2026-11-07', '2026-11-06'), true);
  assert.equal(isFutureHcmDate('2026-11-06', '2026-11-06'), false);
  assert.equal(isFutureHcmDate('2026-11-05', '2026-11-06'), false);
});

test('summary requests carry the selected calendar date in the canonical query parameter', () => {
  assert.equal(heartRateSummaryPath('2026-11-06'), '/statistics/heart-rate/summary?date=2026-11-06');
});

test('time series routes encode the mode-specific calendar parameters', () => {
  assert.equal(heartRateSeriesPath('day', { date: '2026-11-06' }), '/statistics/heart-rate/daily?date=2026-11-06');
  assert.equal(heartRateSeriesPath('week', { weekStartDate: '2026-11-02' }), '/statistics/heart-rate/weekly?weekStartDate=2026-11-02');
  assert.equal(heartRateSeriesPath('custom', { startDate: '2026-11-05', endDate: '2026-11-06' }), '/statistics/heart-rate/custom?startDate=2026-11-05&endDate=2026-11-06');
});

test('statistics date rules use local Monday and validate custom bounds', () => {
  assert.equal(getMonday('2026-11-08'), '2026-11-02');
  assert.equal(validateHeartRateRange('2026-11-05', '2026-11-06', '2026-11-06'), null);
  assert.match(validateHeartRateRange('2026-11-06', '2026-11-05', '2026-11-06'), /on or before/);
  assert.match(validateHeartRateRange('2026-11-01', '2026-12-01', '2026-12-01'), /30 days/);
  assert.match(validateHeartRateRange('2026-11-05', '2026-11-07', '2026-11-06'), /future/);
  assert.match(validateHeartRateRange('2026-02-30', '2026-03-01', '2026-03-01'), /valid dates/);
});
