import { createFields, parseMeasurement, validateCreateFields } from '../utils/profile-form';
import { profileFields, type CreateProfileRequest, type ProfileAttemptReceipt, type ProfileDto, type ProfileField, type ProfileSnapshot, type UpdateProfileRequest } from '../types/profile';
import type { ProfileLoadResult, ProfileOperationResult, ProfileRepository } from '../api/profile-repository';

export type ProfileMockScenario =
  | 'empty'
  | 'populated'
  | 'load-error'
  | 'unauthorized'
  | 'conflict'
  | 'conflict-refresh-failure'
  | 'validation-failure'
  | 'partial-update'
  | 'unconfirmed-after-write'
  | 'unconfirmed-before-write';

export type ProfileMockFault = 'load-error' | 'unauthorized' | 'conflict' | 'conflict-refresh-failure'
  | 'validation-failure' | 'partial-update' | 'unconfirmed-after-write' | 'unconfirmed-before-write';

const emptySnapshot = (): ProfileSnapshot => ({ profile: null, revision: 'revision-0' });
const populatedValues = {
  displayName: 'Linh Anh', birthYear: 2001, gender: 'female' as const,
  heightCm: 165, weightKg: 58.5, activityLevel: 'lightly_active' as const,
};

/** No account information is written to storage. Instances belong to one in-memory account session. */
export class MockProfileRepository implements ProfileRepository {
  private snapshot: ProfileSnapshot;
  private readonly receipts = new Map<string, ProfileAttemptReceipt>();
  private nextFault: ProfileMockFault | null = null;
  private readFault: 'network-error' | 'unauthorized' | null = null;
  private calls = { reads: 0, creates: 0, updates: 0 };

  constructor(scenario: ProfileMockScenario = 'empty') {
    this.snapshot = scenario === 'populated' ? {
      profile: { id: 'mock-profile', values: { ...populatedValues }, updatedAt: '2026-01-01T00:00:00.000Z' },
      revision: 'revision-1',
    } : emptySnapshot();
    if (scenario === 'load-error') this.readFault = 'network-error';
    else if (scenario === 'unauthorized') this.readFault = 'unauthorized';
    else if (scenario !== 'populated' && scenario !== 'empty') this.nextFault = scenario;
  }

  get callCounts() { return { ...this.calls }; }

  setNextFault(fault: ProfileMockFault): void {
    this.nextFault = fault;
  }

  async getMyProfile(attemptId?: string): Promise<ProfileLoadResult> {
    this.calls.reads += 1;
    const fault = this.readFault;
    this.readFault = null;
    if (fault) return { kind: fault };
    const attempt = attemptId ? this.receipts.get(attemptId) : undefined;
    return {
      kind: 'verified',
      snapshot: copySnapshot(this.snapshot),
      ...(attempt ? { attempt: copyReceipt(attempt) } : {}),
    };
  }

  async createMyProfile(request: CreateProfileRequest): Promise<ProfileOperationResult> {
    this.calls.creates += 1;
    const previous = this.receipts.get(request.attemptId);
    if (previous) return copyReceipt(previous);
    const fields = createFields(request.fields);
    const firstField = profileFields.find((field) => fields[field] !== undefined);
    if (!firstField) return this.record(request.attemptId, { kind: 'skipped' });
    if (this.snapshot.profile) return this.record(request.attemptId, { kind: 'conflict', snapshot: copySnapshot(this.snapshot) });

    const errors = validateCreateFields(fields);
    const fault = this.takeFault();
    if (fault === 'unauthorized') return { kind: 'unauthorized' };
    if (fault === 'load-error') return { kind: 'network-error' };
    if (fault === 'conflict' || fault === 'conflict-refresh-failure') return this.concurrentResult(request.attemptId, fault);
    if (fault === 'validation-failure' && !Object.keys(errors).length) errors[firstField] = 'This value could not be accepted.';
    if (Object.keys(errors).length > 0) return this.record(request.attemptId, { kind: 'validation-error', errors });
    if (fault === 'unconfirmed-before-write') {
      this.receipts.set(request.attemptId, { kind: 'not-applied' });
      return { kind: 'unconfirmed', attemptId: request.attemptId };
    }

    this.snapshot = this.nextSnapshot({
      id: `mock-profile-${this.snapshot.revision}`,
      values: normalizeValues(fields),
      updatedAt: '2026-01-01T00:00:01.000Z',
    });
    const result: ProfileAttemptReceipt = { kind: 'success', snapshot: copySnapshot(this.snapshot) };
    this.receipts.set(request.attemptId, result);
    return fault === 'unconfirmed-after-write' ? { kind: 'unconfirmed', attemptId: request.attemptId } : copyReceipt(result);
  }

  async updateMyProfile(request: UpdateProfileRequest): Promise<ProfileOperationResult> {
    this.calls.updates += 1;
    const previous = this.receipts.get(request.attemptId);
    if (previous) return copyReceipt(previous);
    if (request.expectedRevision !== this.snapshot.revision) {
      return this.record(request.attemptId, { kind: 'conflict', snapshot: copySnapshot(this.snapshot) });
    }

    const fault = this.takeFault();
    if (fault === 'unauthorized') return { kind: 'unauthorized' };
    if (fault === 'load-error') return { kind: 'network-error' };
    if (fault === 'conflict' || fault === 'conflict-refresh-failure') return this.concurrentResult(request.attemptId, fault);

    const keys = profileFields.filter((field) => request.patch[field] !== undefined);
    if (keys.length === 0) return this.record(request.attemptId, { kind: 'no-changes' });
    let errors = validateCreateFields(Object.fromEntries(keys
      .filter((field) => request.patch[field] !== null)
      .map((field) => [field, request.patch[field]!])));
    for (const field of keys) {
      if (request.patch[field] === '') errors[field] = 'Provide a value or explicitly clear this field.';
    }
    if (fault === 'validation-failure' && Object.keys(errors).length === 0) {
      errors[keys[0]] = 'This value could not be accepted.';
    }
    if (fault === 'partial-update' && keys.length > 1 && Object.keys(errors).length === 0) {
      const rejectedField = keys[keys.length - 1];
      errors = { [rejectedField]: 'This value could not be accepted.' };
    }

    const values: Partial<ProfileDto['values']> = { ...this.snapshot.profile?.values };
    const validFields = keys.filter((field) => {
      if (errors[field]) return false;
      const value = request.patch[field];
      if (value === null) {
        if (values[field] === undefined) return false;
        delete values[field];
      } else {
        const normalized = normalizeValues({ [field]: value });
        if (normalized[field] === values[field]) return false;
        Object.assign(values, normalized);
      }
      return true;
    });
    if (validFields.length === 0) {
      return this.record(request.attemptId, Object.keys(errors).length
        ? { kind: 'validation-error', errors }
        : { kind: 'no-changes' });
    }
    if (fault === 'unconfirmed-before-write') {
      this.receipts.set(request.attemptId, { kind: 'not-applied' });
      return { kind: 'unconfirmed', attemptId: request.attemptId };
    }

    this.snapshot = this.nextSnapshot({
      id: this.snapshot.profile?.id ?? `mock-profile-${this.snapshot.revision}`,
      values,
      updatedAt: '2026-01-01T00:00:02.000Z',
    });
    const result: ProfileAttemptReceipt = Object.keys(errors).length > 0
      ? { kind: 'partial-success', snapshot: copySnapshot(this.snapshot), applied: validFields, errors }
      : { kind: 'success', snapshot: copySnapshot(this.snapshot) };
    this.receipts.set(request.attemptId, result);
    return fault === 'unconfirmed-after-write' ? { kind: 'unconfirmed', attemptId: request.attemptId } : copyReceipt(result);
  }

  private takeFault(): ProfileMockFault | null {
    const fault = this.nextFault;
    this.nextFault = null;
    return fault;
  }

  private record<T extends ProfileAttemptReceipt>(attemptId: string, result: T): T {
    this.receipts.set(attemptId, copyReceipt(result));
    return copyReceipt(result) as T;
  }

  private nextSnapshot(profile: ProfileDto): ProfileSnapshot {
    return { profile, revision: `revision-${Number(this.snapshot.revision.replace('revision-', '')) + 1}` };
  }

  private concurrentResult(attemptId: string, fault: 'conflict' | 'conflict-refresh-failure'): ProfileAttemptReceipt {
    const values = { ...this.snapshot.profile?.values };
    values.weightKg = values.weightKg === 64 ? 65 : 64;
    this.snapshot = this.nextSnapshot({
      id: this.snapshot.profile?.id ?? 'mock-profile-concurrent',
      values,
      updatedAt: '2026-01-01T00:00:03.000Z',
    });
    if (fault === 'conflict-refresh-failure') this.readFault = 'network-error';
    return this.record(attemptId, { kind: 'conflict', snapshot: copySnapshot(this.snapshot) });
  }
}

function normalizeValues(fields: Partial<Record<ProfileField, string>>): Partial<ProfileDto['values']> {
  const values: Partial<ProfileDto['values']> = {};
  for (const field of profileFields) {
    const value = fields[field];
    if (value === undefined) continue;
    if (field === 'displayName') Object.assign(values, { displayName: value.trim() });
    else if (field === 'birthYear') Object.assign(values, { birthYear: Number(value) });
    else if (field === 'heightCm' || field === 'weightKg') Object.assign(values, { [field]: parseMeasurement(value) });
    else Object.assign(values, { [field]: value });
  }
  return values;
}

function copySnapshot(snapshot: ProfileSnapshot): ProfileSnapshot {
  return { revision: snapshot.revision, profile: snapshot.profile ? {
    ...snapshot.profile,
    values: { ...snapshot.profile.values },
  } : null };
}

function copyReceipt(receipt: ProfileAttemptReceipt): ProfileAttemptReceipt {
  if (receipt.kind === 'success' || receipt.kind === 'conflict') return { ...receipt, snapshot: copySnapshot(receipt.snapshot) };
  if (receipt.kind === 'partial-success') return {
    ...receipt, snapshot: copySnapshot(receipt.snapshot), applied: [...receipt.applied], errors: { ...receipt.errors },
  };
  if (receipt.kind === 'validation-error') return { ...receipt, errors: { ...receipt.errors } };
  return { ...receipt };
}
