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

const {
  dailySummary, weeklySummary, insightList, featuredInsight, aiFixture,
} = require('../src/features/sleep/mocks/sleep-analytics.ts');
const { civilInZone } = require('../src/features/sleep/utils/sleep-date.ts');
const { insightFallback } = require('../src/features/sleep/utils/sleep-insights.ts');

const week = '2026-11-02';
const zone = 'Asia/Ho_Chi_Minh';
const dayRecord = (id, day, minutes, feeling = null, sleepType = 'main') => ({
  id, day, minutes, method: 'duration', sleepType, feeling, revision: 1, confirmedAt: day + 'T12:00:00Z',
});
const range = (id, startAt, endAt, timeZone = zone) => ({
  ...dayRecord(id, civilInZone(new Date(endAt), timeZone).day, (Date.parse(endAt) - Date.parse(startAt)) / 60_000),
  method: 'range', timeZone, startAt, endAt, start: civilInZone(new Date(startAt), timeZone), end: civilInZone(new Date(endAt), timeZone),
});
const base = (sessions, extra = {}) => ({
  sessions, goals: [], goalRevision: 1, context: { today: '2026-11-11', timeZone: zone }, version: 'v1',
  verified: true, goalVerified: true, stale: false, ...extra,
});
const get = (state, code, query = { week }) => insightList(state, query).items.find((item) => item.key.code === code);
const seed = [
  dayRecord('before-1', '2026-10-26', 300, 'tired'),
  dayRecord('before-2', '2026-10-28', 330, 'normal'),
  dayRecord('before-3', '2026-11-01', 360, 'tired'),
  dayRecord('1', '2026-11-02', 360, 'comfortable'),
  dayRecord('2', '2026-11-03', 420, 'comfortable'),
  dayRecord('3', '2026-11-04', 480, 'comfortable'),
  dayRecord('5', '2026-11-06', 300, 'tired'),
  dayRecord('6', '2026-11-07', 330, 'tired'),
  dayRecord('8', '2026-11-08', 390, 'tired'),
  dayRecord('nap', '2026-11-08', 30, 'normal', 'nap'),
];
test('daily sleep value uses one main session and leaves missing days null', () => {
  const state = base([dayRecord('1', week, 1440), dayRecord('2', week, 75, null, 'nap')], {
    goals: [{ effectiveDay: week, minutes: 480 }],
  });
  assert.equal(dailySummary(state, week).minutes, 1440);
  assert.equal(dailySummary(state, week).progress, 1440 / 480 * 100);
  assert.equal(dailySummary(state, '2026-11-03').minutes, null);
  assert.equal(dailySummary(state, '2026-11-03').progress, null);
  assert.equal(dailySummary({ ...state, verified: false }, week).status, 'unverified');
  assert.equal(dailySummary({ ...state, goalVerified: false }, week).progress, null);
});
test('duplicate main records make that day and weekly evidence unverified', () => {
  const state = base([dayRecord('1', week, 420), dayRecord('2', week, 480)]);
  assert.equal(dailySummary(state, week).status, 'unverified');
  const report = weeklySummary(state, { week });
  assert.equal(report.verified, false);
  assert.equal(report.days[0].status, 'unverified');
  assert.equal(report.averageMinutes, null);
  assert.equal(get(state, 'B01').status, 'unverified');
});

test('paired-week feeling evidence is withheld when the prior week has duplicate Main Sleep', () => {
  const previous = [
    dayRecord('prior-duplicate', '2026-10-26', 480, 'comfortable'),
    dayRecord('prior-extra', '2026-10-27', 440, 'normal'),
  ];
  const state = base([...seed, ...previous]);
  assert.equal(get(state, 'B03').eligible, false);
  assert.equal(get(state, 'A03').eligible, false);
  assert.equal(get(state, 'B01').eligible, true);
});
test('weekly average uses unique recorded main days, not sessions, and current coverage uses elapsed dates', () => {
  const report = weeklySummary(base(seed), { week });
  assert.equal(report.recordedDays, 6);
  assert.equal(report.averageMinutes, 2280 / 6);
  assert.equal(report.days[3].status, 'no-data');
  assert.equal(report.elapsedDays, 7);
  const current = weeklySummary(base(seed), { week: '2026-11-09' });
  assert.equal(current.elapsedDays, 3);
  assert.equal(current.days[3].status, 'future');
  assert.equal(current.averageMinutes, null);
  assert.equal(current.storyEligible, false);
});
test('Main-only B/C insights apply distinct-day, paired-week, goal and per-session sample policies', () => {
  const state = base(seed, { goals: [{ effectiveDay: '2026-11-04', minutes: 330 }] });
  for (const code of ['A01', 'A02', 'A03', 'A05', 'B01', 'B03', 'B04', 'C03', 'C04']) {
    assert.equal(get(state, code).status, 'ready', code);
  }
  assert.equal(get(state, 'B02').eligible, false);
  assert.equal(get(state, 'B01').evidence.find((measure) => measure.label === 'Without a feeling').value, 0);
  assert.equal(get(state, 'B01').sourceIds.includes('nap'), false);
  assert.equal(get(state, 'B04').evidence[0].value, 2);
  assert.equal(get(base(seed), 'B04').eligible, false);
  assert.equal(get(base(seed.filter((entry) => entry.id !== '8')), 'C01').eligible, false);
  assert.equal(get(base(seed.filter((entry) => entry.id !== 'before-3')), 'A03').eligible, false);
  assert.equal(get(base(seed), 'C02'), undefined);
});
test('A04 uses the single main range for the day and requires explicit zone', () => {
  const sessions = [
    range('1', '2026-11-01T16:40:00Z', '2026-11-02T00:00:00Z'),
    range('2', '2026-11-02T17:10:00Z', '2026-11-03T00:00:00Z'),
    range('3', '2026-11-03T17:10:00Z', '2026-11-04T00:30:00Z'),
  ];
  assert.equal(get(base(sessions), 'A04').eligible, false);
  const selected = { week, timeZone: zone };
  assert.deepEqual(get(base(sessions), 'A04', selected).evidence.map((value) => value.value), [30, 30]);
  const durationOnly = dayRecord('estimated', '2026-11-04', 420);
  assert.equal(get(base([...sessions.slice(0, 2), durationOnly]), 'A04', selected).eligible, false);
  const tied = range('tie', '2026-11-04T04:00:00Z', '2026-11-04T11:20:00Z');
  assert.equal(get(base([...sessions, tied]), 'A04', selected).eligible, false);
  const otherZone = range('different', '2026-11-04T01:00:00Z', '2026-11-04T09:00:00Z', 'UTC');
  assert.equal(get(base([...sessions, otherZone]), 'A04', selected).eligible, false);
});
test('A04 excludes a transition week and a range crossing DST into a following week', () => {
  const timeZone = 'America/New_York';
  const sessions = [
    range('1', '2026-10-29T03:00:00Z', '2026-10-29T10:00:00Z', timeZone),
    range('2', '2026-10-30T03:00:00Z', '2026-10-30T10:00:00Z', timeZone),
    range('3', '2026-10-31T03:00:00Z', '2026-10-31T10:00:00Z', timeZone),
    range('cross', '2026-11-01T05:00:00Z', '2026-11-02T05:00:00Z', timeZone),
    range('4', '2026-11-03T03:00:00Z', '2026-11-03T10:00:00Z', timeZone),
    range('5', '2026-11-04T03:00:00Z', '2026-11-04T10:00:00Z', timeZone),
  ];
  assert.equal(get(base(sessions), 'A04', { week: '2026-10-26', timeZone }).eligible, false);
  assert.equal(get(base(sessions), 'A04', { week, timeZone }).eligible, false);
});
test('stale and unverified evidence suppress claims; optional AI is consent, evidence and closed-week gated', () => {
  const state = base(seed);
  const request = { kind: 'story', query: { week }, version: state.version };
  assert.equal(aiFixture(state, request, false, false).status, 'consent-required');
  assert.equal(aiFixture(state, request, true, true).status, 'unavailable');
  assert.equal(aiFixture(state, { ...request, version: 'old' }, true, false).status, 'stale');
  assert.equal(aiFixture(state, request, true, false).status, 'fixture');
  assert.ok(aiFixture(state, request, true, false).observations.length <= 2);
  assert.equal(aiFixture(state, { ...request, query: { week: '2026-11-09' } }, true, false).status, 'ineligible');
  const basicOnly = base(seed.slice(0, 3).map((entry) => ({ ...entry, feeling: null })));
  assert.equal(aiFixture(basicOnly, { ...request, query: { week: '2026-10-26' } }, true, false).status, 'ineligible');
  assert.equal(aiFixture({ ...state, verified: false }, request, true, false).status, 'ineligible');
  assert.equal(featuredInsight({ ...state, verified: false }), null);
  assert.equal(get({ ...state, stale: true }, 'B02').status, 'stale');
  assert.deepEqual(get({ ...state, stale: true }, 'B02').evidence, []);
  assert.equal(get({ ...state, verified: false }, 'B02').summary, '');
  const insight = get(state, 'B01');
  assert.equal(aiFixture(state, { kind: 'explanation', insight: insight.key }, true, false).status, 'fixture');
});

const insightCandidate = (code, category, status, eligible, summary = '') => ({
  key: { week, code }, category, title: `Insight ${code}`, status, eligible,
  period: { from: week, to: week, complete: true }, summary, sample: '', coverage: '',
  evidence: [], sourceIds: [], limitations: [],
});

test('insight fallback is shown only for verified no-data or category-specific unmet evidence', () => {
  assert.deepEqual(insightFallback({ items: [], timeZones: [], status: 'no-data' }, 'all'), { kind: 'no-data' });

  const list = {
    status: 'ready', timeZones: [], items: [
      insightCandidate('A01', 'patterns', 'insufficient', false, 'Requires a complete week.'),
      insightCandidate('B01', 'feelings', 'insufficient', false, 'Requires assessed sessions.'),
      insightCandidate('C01', 'discoveries', 'insufficient', false, 'Requires goal and feeling evidence.'),
    ],
  };
  assert.deepEqual(insightFallback(list, 'patterns'), {
    kind: 'insufficient', requirements: [{ title: 'Insight A01', detail: 'Requires a complete week.' }],
  });
  assert.equal(insightFallback(list, 'feelings').requirements[0].title, 'Insight B01');
  assert.equal(insightFallback(list, 'discoveries').requirements[0].title, 'Insight C01');
});

test('ready insights take precedence and unverified, stale or unspecified evidence stay unavailable', () => {
  const eligible = insightCandidate('A01', 'patterns', 'ready', true, 'Ready insight.');
  const insufficient = insightCandidate('A02', 'patterns', 'insufficient', false, 'Complete a longer record.');
  assert.deepEqual(insightFallback({ status: 'ready', timeZones: [], items: [eligible, insufficient] }, 'patterns'), { kind: 'none' });
  assert.deepEqual(insightFallback({ status: 'unverified', timeZones: [], items: [insufficient] }, 'patterns'), { kind: 'unavailable' });
  assert.deepEqual(insightFallback({ status: 'stale', timeZones: [], items: [insufficient] }, 'patterns'), { kind: 'unavailable' });
  assert.deepEqual(insightFallback({ status: 'ready', timeZones: [], items: [] }, 'patterns'), { kind: 'unavailable' });
  assert.deepEqual(insightFallback({ status: 'ready', timeZones: [], items: [insightCandidate('A02', 'patterns', 'insufficient', false)] }, 'patterns'), { kind: 'unavailable' });
});
