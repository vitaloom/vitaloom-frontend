const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const { HttpSleepRepository, mapRecentSleepReport } = require('../src/features/sleep/api/http-sleep-repository.ts');
const { ApiError } = require('../src/lib/api/http-client.ts');

function report(dataStatus = 'VERIFIED', recordedDays = 3) {
  const start = new Date('2026-11-08T00:00:00Z');
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start.getTime() + index * 86400000).toISOString().slice(0, 10);
    return { day, status: index < recordedDays ? 'RECORDED' : 'NOT_RECORDED', minutes: index < recordedDays ? 420 + index : null };
  });
  if (dataStatus === 'UNVERIFIED_DATA') {
    for (const day of days) {
      if (day.status !== 'RECORDED') Object.assign(day, { status: 'UNVERIFIED', minutes: null });
    }
  }
  if (dataStatus === 'NO_DATA') {
    for (const day of days) Object.assign(day, { status: 'NOT_RECORDED', minutes: null });
  }
  const count = days.filter((day) => day.status === 'RECORDED').length;
  return {
    period: { start: '2026-11-08', end: '2026-11-14', timeZone: 'Asia/Ho_Chi_Minh' },
    dataStatus, days,
    recordedDays: dataStatus === 'UNVERIFIED_DATA' ? null : count,
    coverageDenominator: 7,
    averageMinutesPerRecordedDay: dataStatus === 'UNVERIFIED_DATA' || count === 0 ? null : 421,
    insights: dataStatus === 'VERIFIED' && count >= 3
      ? [{ code: 'A01', status: 'READY', sampleDays: count, denominatorDays: 7 }]
      : [],
    highlights: dataStatus === 'VERIFIED' && count >= 3
      ? [{ code: 'A01', status: 'READY', title: 'Coverage', summary: '3 of 7 days' }]
      : [],
  };
}

test('maps verified Recent responses without recalculating API metrics', () => {
  for (const count of [0, 1, 2, 3, 7]) {
    const payload = report(count === 0 ? 'NO_DATA' : 'VERIFIED', count);
    const mapped = mapRecentSleepReport(payload);
    assert.equal(mapped.days.length, 7);
    assert.equal(mapped.recordedDays, count);
    assert.equal(mapped.coverageDenominator, 7);
    assert.equal(mapped.averageMinutesPerRecordedDay, payload.averageMinutesPerRecordedDay);
    assert.equal(mapped.insights.length, count >= 3 ? 1 : 0);
    if (count < 7) assert.equal(mapped.days.find((day) => day.status === 'not-recorded')?.minutes, null);
  }
});

test('maps verified individual facts while withholding unverified aggregates', () => {
  const mapped = mapRecentSleepReport(report('UNVERIFIED_DATA', 3));
  assert.equal(mapped.dataStatus, 'unverified-data');
  assert.equal(mapped.days[1].status, 'recorded');
  assert.equal(mapped.days[6].status, 'unverified');
  assert.equal(mapped.recordedDays, null);
  assert.equal(mapped.averageMinutesPerRecordedDay, null);
  assert.deepEqual(mapped.insights, []);
  assert.deepEqual(mapped.highlights, []);
});

test('maps READY A/B highlights in server order and caps the list at three', () => {
  const payload = report();
  payload.highlights = [
    { code: 'B01', status: 'READY', title: 'Feeling', summary: 'Feeling summary' },
    { code: 'A01', status: 'READY', title: 'Coverage', summary: 'Coverage summary' },
  ];
  assert.deepEqual(mapRecentSleepReport(payload).highlights, payload.highlights);
});

test('Recent accepts READY highlights from the expanded A/B insight catalog', () => {
  const value = report();
  value.highlights = ['A04', 'A05', 'B02'].map((code) => ({
    code, status: 'READY', title: `${code} title`, summary: `${code} summary`,
  }));
  assert.deepEqual(mapRecentSleepReport(value).highlights.map(({ code }) => code), ['A04', 'A05', 'B02']);
});

test('keeps the legacy A01 adapter unchanged and falls back only when highlights is absent', () => {
  const legacy = report();
  delete legacy.highlights;
  const mappedLegacy = mapRecentSleepReport(legacy);
  assert.equal(mappedLegacy.insights[0].code, 'A01');
  assert.equal(mappedLegacy.highlights, undefined);

  const current = report();
  current.highlights = [];
  assert.deepEqual(mapRecentSleepReport(current).highlights, []);
});

test('rejects malformed, locked, or unsupported highlights', () => {
  const invalidHighlights = [
    [{ code: 'C01', status: 'READY', title: 'x', summary: 'y' }],
    [{ code: 'B01', status: 'INSUFFICIENT_DATA', title: 'x', summary: 'y' }],
    [{ code: 'B01', status: 'READY', title: '', summary: 'y' }],
    [{ code: 'B01', status: 'READY', title: 'x', summary: null }],
    [
      { code: 'B01', status: 'READY', title: 'x', summary: 'y' },
      { code: 'B01', status: 'READY', title: 'z', summary: 'w' },
    ],
  ];
  for (const highlights of invalidHighlights) {
    const value = report();
    value.highlights = highlights;
    assert.throws(() => mapRecentSleepReport(value));
  }
});

test('rejects missing fields, invalid dates, out of order days, and contradictory aggregates', () => {
  const malformed = [
    (value) => { delete value.days[2].minutes; },
    (value) => { value.days[2].day = '2026-02-30'; },
    (value) => { [value.days[0], value.days[1]] = [value.days[1], value.days[0]]; },
    (value) => { value.coverageDenominator = 8; },
    (value) => { value.insights = [{ code: 'A01', status: 'READY', sampleDays: 2, denominatorDays: 7 }]; },
    (value) => { value.dataStatus = 'NO_DATA'; value.recordedDays = 3; },
    (value) => { value.averageMinutesPerRecordedDay = 1441; },
    (value) => {
      value.dataStatus = 'VERIFIED';
      for (const day of value.days) Object.assign(day, { status: 'NOT_RECORDED', minutes: null });
      value.recordedDays = 0;
      value.averageMinutesPerRecordedDay = null;
      value.insights = [];
    },
  ];
  for (const mutate of malformed) {
    const value = report();
    mutate(value);
    assert.throws(() => mapRecentSleepReport(value));
  }
});

test('GET Recent uses the authenticated Sleep API and exposes transport errors', async () => {
  const requests = [];
  const request = async (path, init, authenticated) => {
    requests.push({ path, init, authenticated });
    const response = requests.length === 1 ? report() : new ApiError(401, 'UNAUTHORIZED', 'Sign in again');
    if (response instanceof Error) throw response;
    return response;
  };
  const repository = new HttpSleepRepository(request);
  assert.equal((await repository.getRecent()).kind, 'ready');
  assert.equal(requests[0].path, '/sleep/recent?catalog=full');
  assert.equal(requests[0].init.method, 'GET');
  assert.equal(requests[0].authenticated, true);
  assert.deepEqual(await repository.getRecent(), { kind: 'error', message: 'Sign in again', code: 'UNAUTHORIZED' });
  const offline = new HttpSleepRepository(async () => { throw new ApiError(0, 'NETWORK_ERROR', 'Offline'); });
  assert.deepEqual(await offline.getRecent(), { kind: 'error', message: 'Offline', code: 'NETWORK_ERROR' });
});

test('Recent screen keeps the weekly link and renders all seven server day statuses', () => {
  const route = fs.readFileSync('src/app/sleep/recent.tsx', 'utf8');
  const legacyRoute = fs.readFileSync('src/app/sleep/weekly.tsx', 'utf8');
  const screen = fs.readFileSync('src/features/sleep/screens/recent-sleep-report-screen.tsx', 'utf8');
  assert.match(route, /recent-sleep-report-screen/);
  assert.match(legacyRoute, /recent-sleep-report-screen/);
  assert.match(screen, /report\.days\.map/);
  assert.match(screen, /accessibilityLabel=\{`\$\{sleepDay\(day\.day, locale\)\}\. \$\{status\}`\}/);
  assert.match(screen, /day\.status === 'recorded' && day\.minutes !== null/);
  assert.match(screen, /day\.status === 'unverified'/);
  assert.match(screen, /onPress: \(\) => router\.push\(\{ pathname: '\/sleep\/insights\/\[code\]', params: \{ code: insight\.code \} \}\)/);
  assert.match(screen, /insight\.status === 'READY'/);
  assert.match(screen, /insight\.status === 'ready'/);
  assert.match(screen, /report\.dataStatus === 'verified'[\s\S]*insight\.status === 'ready'/);
  assert.match(screen, /theme\.sleep/);
  assert.match(screen, /recentCoverage/);
  assert.match(screen, /reportInsightsEmpty/);
  assert.match(screen, /unverifiedReport/);
  assert.match(screen, /recentDemoUnavailable/);
  assert.match(screen, /report\.highlights/);
  assert.match(screen, /\/sleep\/insights/);
  assert.match(screen, /\/sleep\/insights\/\[code\]/);
  assert.match(screen, /viewAllInsights/);
});
