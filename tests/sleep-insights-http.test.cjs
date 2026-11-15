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
const { sleepGoalInsightCopy } = require('../src/features/sleep/utils/sleep-goal-insight-copy.ts');
const { readSleepDetailVisual } = require('../src/features/sleep/utils/sleep-detail-evidence.ts');

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

test('All Insights reads the four Goal-catalog codes from the additive catalog endpoint', async () => {
  const payload = { period, items: [
    item('READY', { code: 'A01', category: 'A', locked: false }),
    item('READY', { code: 'A02', category: 'A', title: 'Goal Achievement', locked: false,
      sample: { eligibleMainDays: 3 }, evidence: { metGoalDays: 2, eligibleMainDays: 3 } }),
    item('INSUFFICIENT_DATA'),
    item('READY', { code: 'B04', title: 'Tired sessions at goal', locked: false,
      sample: { ratedMain: 3, comparableRatedMain: 2 },
      evidence: { exceptionCount: 1, ratedMain: 3, exceptions: [
        { day: '2026-11-13', minutes: 480, goalMinutes: 465 },
      ] } }),
  ] };
  const { repository, requests } = repositoryFor([payload]);
  assert.deepEqual(await repository.getAllInsights(), { kind: 'ready', data: payload });
  assert.equal(requests[0].path, '/sleep/insights?catalog=goal');
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

test('Insight Detail reads the selected existing code without query parameters and retains missing-feeling sample data', async () => {
  const payload = detail();
  const { repository, requests } = repositoryFor([payload]);
  assert.deepEqual(await repository.getInsightDetail('B01'), { kind: 'ready', data: payload });
  assert.equal(requests[0].path, '/sleep/insights/B01');
  assert.equal(requests[0].authenticated, true);
  assert.equal(payload.sample.mainWithoutFeeling, 1);
});

test('Goal insight details read A02 and B04 with historical evidence on their existing detail routes', async () => {
  const a02 = {
    code: 'A02', category: 'A', status: 'READY', period, title: 'Goal Achievement',
    summary: 'Three eligible days met the goal twice.', sample: { eligibleMainDays: 3 },
    evidence: { metGoalDays: 2, eligibleMainDays: 3 }, sourceRefs: ['main-1', 'main-2', 'main-3'],
    limitations: ['Descriptive only.'], policyVersion: 'policy-1', evidenceVersion: 'a02-v1',
  };
  const b04 = {
    code: 'B04', category: 'B', status: 'READY', period, title: 'Tired sessions at goal',
    summary: 'One tired session met its historical goal.',
    sample: { ratedMain: 3, comparableRatedMain: 2 },
    evidence: { exceptionCount: 1, ratedMain: 3, exceptions: [
      { day: '2026-11-13', minutes: 480, goalMinutes: 465 },
    ] },
    sourceRefs: ['main-3'], limitations: ['Descriptive only.'], policyVersion: 'policy-1', evidenceVersion: 'b04-v1',
  };
  const { repository, requests } = repositoryFor([a02, b04]);
  assert.deepEqual(await repository.getInsightDetail('A02'), { kind: 'ready', data: a02 });
  assert.deepEqual(await repository.getInsightDetail('B04'), { kind: 'ready', data: b04 });
  assert.deepEqual(requests.map(({ path }) => path), ['/sleep/insights/A02', '/sleep/insights/B04']);
});

test('Goal insight details reject malformed historical evidence', async () => {
  const a02 = {
    code: 'A02', category: 'A', status: 'READY', period, title: 'Goal Achievement',
    sample: { eligibleMainDays: 2 }, evidence: { metGoalDays: 3, eligibleMainDays: 2 },
    sourceRefs: [], limitations: [], policyVersion: 'policy-1', evidenceVersion: 'a02-v1',
  };
  const b04 = {
    code: 'B04', category: 'B', status: 'READY', period, title: 'Tired sessions at goal',
    sample: { ratedMain: 3, comparableRatedMain: 2 },
    evidence: { exceptionCount: 1, ratedMain: 3, exceptions: [
      { day: '2026-11-15', minutes: 480, goalMinutes: 465 },
    ] },
    sourceRefs: [], limitations: [], policyVersion: 'policy-1', evidenceVersion: 'b04-v1',
  };
  const { repository } = repositoryFor([a02, b04]);
  assert.equal((await repository.getInsightDetail('A02')).kind, 'error');
  assert.equal((await repository.getInsightDetail('B04')).kind, 'error');
});

test('A02 and B04 display the same server-count summaries in English and Vietnamese', () => {
  const dictionaries = {
    en: {
      goalInsightA02Title: 'Goal Achievement',
      goalInsightA02Summary: 'Goal met on {met} of {eligible} eligible days.',
      goalInsightB04Title: 'Tired despite meeting Goal',
      goalInsightB04Summary: 'Reported tired despite meeting the historical Goal on {exceptions} of {rated} rated Main Sleep days.',
    },
    vi: {
      goalInsightA02Title: 'Đạt mục tiêu giấc ngủ',
      goalInsightA02Summary: 'Đạt mục tiêu trong {met}/{eligible} ngày hợp lệ.',
      goalInsightB04Title: 'Mệt mỏi dù đạt mục tiêu',
      goalInsightB04Summary: 'Có {exceptions}/{rated} ngày ngủ chính được đánh giá là mệt mỏi dù vẫn đạt mục tiêu lịch sử.',
    },
  };
  const translate = (language) => (key, values = {}) =>
    dictionaries[language][key].replace(/\{(\w+)\}/g, (_, name) => String(values[name]));
  const a02 = { sample: { eligibleMainDays: 3 }, evidence: { metGoalDays: 2, eligibleMainDays: 3 } };
  const b04 = {
    sample: { ratedMain: 3, comparableRatedMain: 2 },
    evidence: { exceptionCount: 1, ratedMain: 3, exceptions: [{ day: '2026-11-13', minutes: 480, goalMinutes: 465 }] },
  };

  assert.deepEqual(sleepGoalInsightCopy('A02', a02.sample, a02.evidence, translate('en')), {
    title: 'Goal Achievement', summary: 'Goal met on 2 of 3 eligible days.',
  });
  assert.deepEqual(sleepGoalInsightCopy('A02', a02.sample, a02.evidence, translate('vi')), {
    title: 'Đạt mục tiêu giấc ngủ', summary: 'Đạt mục tiêu trong 2/3 ngày hợp lệ.',
  });
  assert.deepEqual(sleepGoalInsightCopy('B04', b04.sample, b04.evidence, translate('en')), {
    title: 'Tired despite meeting Goal',
    summary: 'Reported tired despite meeting the historical Goal on 1 of 3 rated Main Sleep days.',
  });
  assert.deepEqual(sleepGoalInsightCopy('B04', b04.sample, b04.evidence, translate('vi')), {
    title: 'Mệt mỏi dù đạt mục tiêu',
    summary: 'Có 1/3 ngày ngủ chính được đánh giá là mệt mỏi dù vẫn đạt mục tiêu lịch sử.',
  });
});

test('Goal insight copy withholds its summary when server counts disagree', () => {
  const translate = (key, values) => values ? key + ':' + JSON.stringify(values) : key;
  assert.deepEqual(sleepGoalInsightCopy('A02', { eligibleMainDays: 3 }, {
    metGoalDays: 4, eligibleMainDays: 3,
  }, translate), { title: 'goalInsightA02Title' });
  assert.deepEqual(sleepGoalInsightCopy('B04', { ratedMain: 3, comparableRatedMain: 2 }, {
    exceptionCount: 2, ratedMain: 3, exceptions: [{}],
  }, translate), { title: 'goalInsightB04Title' });
});

test('Detail visual reader validates current numeric evidence and exact B04 exception rows', () => {
  const a01 = { code: 'A01', status: 'READY', period,
    sample: { recordedMainDays: 4, coverageDenominator: 7 },
    evidence: { recordedMainDays: 4, coverageDenominator: 7 } };
  const a02 = { code: 'A02', status: 'READY', period,
    sample: { eligibleMainDays: 4 }, evidence: { metGoalDays: 3, eligibleMainDays: 4 } };
  const b01 = { code: 'B01', status: 'READY', period,
    sample: { ratedMain: 3, mainWithoutFeeling: 2 }, evidence: {
      comfortable: { count: 1, denominator: 3, percentage: 33.33 },
      normal: { count: 1, denominator: 3, percentage: 33.33 },
      tired: { count: 1, denominator: 3, percentage: 33.33 }, mainWithoutFeeling: 2,
    } };
  const b04 = { code: 'B04', status: 'READY', period,
    sample: { ratedMain: 3, comparableRatedMain: 2 }, evidence: {
      exceptionCount: 1, ratedMain: 3,
      exceptions: [{ day: '2026-11-13', minutes: 480, goalMinutes: 465 }],
    } };
  assert.deepEqual(readSleepDetailVisual(a01), { code: 'A01', recordedMainDays: 4, denominator: 7 });
  assert.deepEqual(readSleepDetailVisual(a02), { code: 'A02', metGoalDays: 3, eligibleMainDays: 4 });
  assert.equal(readSleepDetailVisual(b01).ratedMain, 3);
  assert.equal(readSleepDetailVisual(b04).exceptions.length, 1);

  const invalid = [
    { ...b01, evidence: { ...b01.evidence, comfortable: { count: 2, denominator: 3, percentage: 66.67 } } },
    { ...b01, evidence: { ...b01.evidence, tired: { count: 1, denominator: 2, percentage: 50 } } },
    { ...b01, evidence: { ...b01.evidence, normal: { count: 1, denominator: 3, percentage: 34 } } },
    { ...b01, evidence: { ...b01.evidence, normal: { count: 1, denominator: 3, percent: 33.33 } } },
    { ...b01, sample: { ratedMain: 6, mainWithoutFeeling: 2 } },
    { ...a01, evidence: { recordedMainDays: 4, coverageDenominator: 8 } },
    { ...a02, evidence: { metGoalDays: 5, eligibleMainDays: 4 } },
    { ...a02, evidence: { metGoalDays: 2, eligibleMainDays: 3 } },
    { ...b04, evidence: { ...b04.evidence, exceptions: [
      ...b04.evidence.exceptions, ...b04.evidence.exceptions,
    ] } },
    { ...b04, evidence: { ...b04.evidence, exceptions: [
      { day: '2026-11-13', minutes: 480, goalMinutes: 465 },
      { day: '2026-11-13', minutes: 480, goalMinutes: 465 },
    ], exceptionCount: 2 } },
    { ...b04, evidence: { ...b04.evidence, exceptions: [
      { day: '2026-11-13', minutes: 480, goalMinutes: 467 },
    ] } },
  ];
  for (const value of invalid) assert.equal(readSleepDetailVisual(value), null);
  assert.equal(readSleepDetailVisual({ ...b01, status: 'INSUFFICIENT_DATA' }), null);
});

test('A01/A02 calendars use seven validated day states from Detail only', () => {
  const daysWith = (statuses) => statuses.map((status, index) => ({
    day: `2026-11-${String(8 + index).padStart(2, '0')}`, status,
  }));
  const coverage = { recordedMainDays: 3, coverageDenominator: 7 };
  const a01 = { code: 'A01', status: 'READY', period, sample: coverage, evidence: { ...coverage } };
  const a02 = { code: 'A02', status: 'READY', period, sample: { eligibleMainDays: 3 },
    evidence: { metGoalDays: 2, eligibleMainDays: 3 } };
  for (const [detail, days] of [
    [a01, daysWith(['RECORDED', 'NOT_RECORDED', 'RECORDED', 'NOT_RECORDED', 'NOT_RECORDED', 'RECORDED', 'NOT_RECORDED'])],
    [a02, daysWith(['MET', 'NO_MAIN', 'NO_GOAL', 'MISSED', 'NO_MAIN', 'NO_MAIN', 'MET'])],
  ]) {
    const withDays = (value) => ({ ...detail, evidence: { ...detail.evidence, days: value } });
    assert.deepEqual(readSleepDetailVisual(withDays(days)).days, days);
    for (const malformed of [
      [...days].reverse(), days.slice(1), [{ ...days[0], day: days[1].day }, ...days.slice(1)],
      [{ ...days[0], status: 'UNKNOWN' }, ...days.slice(1)],
      [{ ...days[0], status: days[1].status }, ...days.slice(1)],
    ]) assert.equal(readSleepDetailVisual(withDays(malformed)).days, undefined);
    assert.equal(readSleepDetailVisual(detail).days, undefined);
    assert.equal(readSleepDetailVisual({ ...withDays(days), status: 'UNVERIFIED_DATA' }), null);
  }
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

test('AI consent and Recent Story use authenticated server-owned HTTP contracts', async () => {
  const story = { status: 'STORY', headline: 'Recent sleep', observations: [
    { insightCode: 'B01', text: 'A pattern', dataContext: '3 rated sessions', evidenceFingerprint: 'fp-1' },
  ] };
  const { repository, requests } = repositoryFor([
    { enabled: true, available: true }, story, { enabled: false, available: true },
  ]);
  assert.deepEqual(await repository.getAiConsent(), { kind: 'ready', data: { enabled: true, available: true } });
  assert.deepEqual(await repository.getRecentStory(), { kind: 'ready', data: story });
  assert.deepEqual(await repository.mutate('consent-1', { kind: 'set-ai-consent', enabled: false }), { kind: 'confirmed', version: 'server' });
  assert.deepEqual(requests.map(({ path, init, authenticated }) => [path, init.method, authenticated]), [
    ['/sleep/ai/consent', 'GET', true], ['/sleep/recent/story', 'GET', true], ['/sleep/ai/consent', 'PUT', true],
  ]);
  assert.equal(requests[2].init.body, JSON.stringify({ enabled: false }));
});

test('Recent Story rejects invalid status, unsupported claims and more than two observations', async () => {
  const observation = { insightCode: 'B01', text: 'x', dataContext: 'x', evidenceFingerprint: 'x' };
  const invalid = [
    { status: 'UNKNOWN' },
    { status: 'STORY' },
    { status: 'STORY', headline: 'x', observations: [{ ...observation, insightCode: 'C01' }] },
    { status: 'FALLBACK', headline: 'x', observations: [{ ...observation, insightCode: 'A01' }] },
    { status: 'STORY', headline: 'x', observations: [observation, observation] },
    { status: 'STORY', headline: 'x', observations: [observation, observation, observation] },
  ];
  const { repository } = repositoryFor(invalid);
  for (let index = 0; index < invalid.length; index += 1) assert.equal((await repository.getRecentStory()).kind, 'error');
});

test('AI consent writes confirm the state returned by the server', async () => {
  const { repository } = repositoryFor([{ enabled: false, available: true }]);
  const outcome = await repository.mutate('consent-1', { kind: 'set-ai-consent', enabled: true });
  assert.equal(outcome.kind, 'rejected');
});

test('Detail reads do not request explanations and explicit requests use authenticated POST', async () => {
  const fields = { observation: 'Quan sát', evidenceBasis: 'Bằng chứng', limitations: 'Giới hạn', evidenceFingerprint: 'fp' };
  const { repository, requests } = repositoryFor([detail(), { status: 'FALLBACK', ...fields }, { status: 'STALE' }]);
  await repository.getInsightDetail('B01');
  assert.deepEqual(requests.map(({ path }) => path), ['/sleep/insights/B01']);
  const query = { kind: 'explanation', insight: { code: 'B01', version: 'fp' } };
  assert.deepEqual(await repository.getAi(query), { kind: 'ready', data: { status: 'fallback', ...fields } });
  assert.deepEqual(await repository.getAi(query), { kind: 'ready', data: { status: 'stale' } });
  assert.equal(requests[1].path, '/sleep/ai/explanations');
  assert.equal(requests[1].authenticated, true);
  assert.equal(requests[1].init.method, 'POST');
  assert.deepEqual(JSON.parse(requests[1].init.body), { insightCode: 'B01', evidenceVersion: 'fp' });
});
