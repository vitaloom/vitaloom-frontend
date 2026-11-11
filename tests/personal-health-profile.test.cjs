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

const { MockProfileRepository } = require('../src/features/personal-health-profile/mocks/mock-profile-repository.ts');
const {
  buildPatch, createFields, draftFromSnapshot, formatProfileValue, validateCreateFields,
} = require('../src/features/personal-health-profile/utils/profile-form.ts');

async function snapshot(repository) {
  const result = await repository.getMyProfile();
  assert.equal(result.kind, 'verified');
  return result.snapshot;
}

const valuesOf = (state) => state.profile?.values;
const create = (repository, fields, attemptId = 'create') => repository.createMyProfile({ fields, attemptId });
const patch = (repository, base, fields, attemptId = 'update') =>
  repository.updateMyProfile({ patch: fields, expectedRevision: base.revision, attemptId });

test('F1 distinguishes empty drafts from supplied invalid values and does not write before save', async () => {
  const repository = new MockProfileRepository();
  const draft = draftFromSnapshot();
  assert.deepEqual(createFields(draft), {});
  assert.equal(repository.callCounts.creates, 0);
  assert.equal((await create(repository, {})).kind, 'skipped');
  const fields = createFields({ ...draft, displayName: '   ', weightKg: '60' });
  assert.equal((await create(repository, fields, 'bad')).kind, 'validation-error');
  assert.equal((await snapshot(repository)).profile, null);
  const valid = await create(repository, { displayName: '  Vita  ', weightKg: '58,5' }, 'valid');
  assert.equal(valid.kind, 'success');
  assert.deepEqual(valuesOf(valid.snapshot), { displayName: 'Vita', weightKg: 58.5 });
});

test('validation enforces numeric bounds, enum membership and supplied whitespace', () => {
  const accepted = {
    birthYear: '2026', heightCm: '20', weightKg: '0.3', gender: 'prefer_not_to_say', activityLevel: 'very_active',
  };
  assert.deepEqual(validateCreateFields(accepted, 2026), {});
  const invalid = {
    birthYear: '2027', displayName: '   ', heightCm: '301', weightKg: '0.29', gender: 'unset', activityLevel: '5',
  };
  assert.equal(Object.keys(validateCreateFields(invalid, 2026)).length, 6);
  assert.ok(validateCreateFields({ birthYear: '2001.5' }).birthYear);
  assert.ok(validateCreateFields({ heightCm: '0xA5' }).heightCm);
});

test('F1 concurrent create preserves the first complete write', async () => {
  const repository = new MockProfileRepository();
  const [first, second] = await Promise.all([
    create(repository, { weightKg: '64' }, 'first'),
    create(repository, { displayName: 'Do not apply' }, 'second'),
  ]);
  assert.equal(first.kind, 'success');
  assert.equal(second.kind, 'conflict');
  assert.deepEqual(valuesOf(await snapshot(repository)), { weightKg: 64 });
});

test('F2 patch includes only intentional differences, including explicit clear and invalid edits', async () => {
  const base = await snapshot(new MockProfileRepository('populated'));
  const draft = { ...draftFromSnapshot(base), displayName: '', heightCm: '165.0', birthYear: '2001.0', weightKg: '70' };
  const touched = new Set(['displayName', 'heightCm', 'birthYear']);
  assert.deepEqual(buildPatch(draft, base, touched), { displayName: null, birthYear: '2001.0' });
  const empty = await snapshot(new MockProfileRepository());
  assert.deepEqual(buildPatch({ ...draftFromSnapshot(empty), displayName: '  ' }, empty, new Set(['displayName'])), { displayName: '  ' });
  assert.deepEqual(buildPatch(draftFromSnapshot(base), base, new Set(['weightKg'])), {});
  assert.equal(formatProfileValue('gender', { gender: 'prefer_not_to_say' }), 'Prefer not to say');
  assert.equal(formatProfileValue('gender', {}), 'Not added');
});

test('F2 starts from absence without creating empty data', async () => {
  const repository = new MockProfileRepository();
  const base = await snapshot(repository);
  assert.equal((await patch(repository, base, {}, 'no-change')).kind, 'no-changes');
  assert.equal((await patch(repository, base, { displayName: null }, 'already-unset')).kind, 'no-changes');
  assert.equal((await patch(repository, base, { weightKg: '900' }, 'invalid-only')).kind, 'validation-error');
  assert.equal((await snapshot(repository)).profile, null);
  const result = await patch(repository, base, { heightCm: '450', weightKg: '60' }, 'first-values');
  assert.equal(result.kind, 'partial-success');
  assert.deepEqual(result.applied, ['weightKg']);
  assert.ok(result.errors.heightCm);
  assert.deepEqual(valuesOf(result.snapshot), { weightKg: 60 });
});

test('F2 partial success preserves rejected and untouched values, and can clear all fields', async () => {
  const repository = new MockProfileRepository('populated');
  const base = await snapshot(repository);
  const result = await patch(repository, base, { displayName: 'New name', heightCm: '335' }, 'partial');
  assert.equal(result.kind, 'partial-success');
  assert.deepEqual(result.applied, ['displayName']);
  assert.ok(result.errors.heightCm);
  assert.equal(valuesOf(result.snapshot).heightCm, 165);
  assert.equal(valuesOf(result.snapshot).weightKg, 58.5);
  const cleared = await patch(repository, result.snapshot, Object.fromEntries(
    Object.keys(valuesOf(result.snapshot)).map((field) => [field, null]),
  ), 'clear-all');
  assert.equal(cleared.kind, 'success');
  assert.equal(cleared.snapshot.profile.id, base.profile.id);
  assert.deepEqual(valuesOf(cleared.snapshot), {});
});

test('F2 conflicts before validation, including first creation from absence', async () => {
  const repository = new MockProfileRepository();
  const base = await snapshot(repository);
  const first = await patch(repository, base, { weightKg: '75' }, 'first');
  assert.equal(first.kind, 'success');
  const stale = await patch(repository, base, { heightCm: '999', displayName: 'Stale' }, 'stale');
  assert.equal(stale.kind, 'conflict');
  const latest = await snapshot(repository);
  assert.equal(latest.revision, first.snapshot.revision);
  assert.deepEqual(valuesOf(latest), { weightKg: 75 });
  assert.deepEqual(buildPatch(draftFromSnapshot(latest), latest, new Set()), {});
});

test('mock conflict fault occurs during save and can block the subsequent read once', async () => {
  const repository = new MockProfileRepository('conflict-refresh-failure');
  const base = await snapshot(repository);
  assert.equal((await patch(repository, base, { displayName: 'Stale' })).kind, 'conflict');
  assert.equal((await repository.getMyProfile()).kind, 'network-error');
  assert.equal(valuesOf(await snapshot(repository)).displayName, undefined);
});

test('mock read failure and authorization failure are separate from verified absence', async () => {
  const repository = new MockProfileRepository('load-error');
  assert.equal((await repository.getMyProfile()).kind, 'network-error');
  assert.equal((await snapshot(repository)).profile, null);
  const unavailable = new MockProfileRepository('unauthorized');
  assert.equal((await unavailable.getMyProfile()).kind, 'unauthorized');
});

test('unknown acknowledgments reconcile with terminal receipts and never double-write', async () => {
  const repository = new MockProfileRepository('unconfirmed-after-write');
  const first = await create(repository, { weightKg: '63' }, 'lost-ack');
  assert.deepEqual(first, { kind: 'unconfirmed', attemptId: 'lost-ack' });
  const current = await repository.getMyProfile('lost-ack');
  assert.equal(current.kind, 'verified');
  assert.equal(current.attempt.kind, 'success');
  assert.equal(current.attempt.snapshot.revision, current.snapshot.revision);
  const replay = await create(repository, { weightKg: '63' }, 'lost-ack');
  assert.equal(replay.snapshot.revision, current.snapshot.revision);

  const another = new MockProfileRepository('unconfirmed-before-write');
  const absent = await snapshot(another);
  assert.equal((await patch(another, absent, { heightCm: '165' }, 'unsent')).kind, 'unconfirmed');
  const verified = await another.getMyProfile('unsent');
  assert.equal(verified.attempt.kind, 'not-applied');
  assert.equal(verified.snapshot.profile, null);
});

test('returned snapshots and receipt objects do not alias mock storage', async () => {
  const repository = new MockProfileRepository();
  const saved = await create(repository, { displayName: 'First' });
  saved.snapshot.profile.values.displayName = 'Unsafe mutation';
  assert.deepEqual(valuesOf(await snapshot(repository)), { displayName: 'First' });
  assert.equal(valuesOf((await repository.getMyProfile('create')).attempt.snapshot).displayName, 'First');
});
