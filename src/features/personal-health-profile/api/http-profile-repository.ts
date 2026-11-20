import { ApiError, apiRequest } from '@/lib/api/http-client';
import type { ProfileRepository } from './profile-repository';
import { validateCreateFields } from '../utils/profile-form';
import type {
  CreateProfileRequest,
  ProfileAttemptReceipt,
  ProfileField,
  ProfileFieldErrors,
  ProfileLoadResult,
  ProfileOperationResult,
  ProfileSnapshot,
  UpdateProfileRequest,
} from '../types/profile';

type SnapshotResponse = { snapshot: ProfileSnapshot };
type OperationResponse = ProfileAttemptReceipt;

function fieldErrors(body: Record<string, unknown>): ProfileFieldErrors {
  if (body.errors && typeof body.errors === 'object') {
    const entries = Object.entries(body.errors as Record<string, unknown>);
    return Object.fromEntries(entries.map(([field, value]) => {
      const key = field as ProfileField;
      const message = typeof value === 'string' && value !== 'INVALID_VALUE'
        ? value
        : validationMessage(key) ?? String(value ?? 'Invalid value.');
      return [key, message];
    })) as ProfileFieldErrors;
  }
  if (typeof body.field === 'string') return {
    [body.field as ProfileField]: validationMessage(body.field as ProfileField)
      ?? String(body.detail ?? 'Invalid value.'),
  };
  return {};
}

const invalidSamples: Record<ProfileField, string> = {
  displayName: '   ',
  birthYear: 'not-a-year',
  gender: 'invalid',
  heightCm: 'invalid',
  weightKg: 'invalid',
  activityLevel: 'invalid',
};

function validationMessage(field: ProfileField): string | undefined {
  return validateCreateFields({ [field]: invalidSamples[field] })[field];
}

function validSnapshot(value: unknown): value is ProfileSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<ProfileSnapshot>;
  return typeof snapshot.revision === 'string' && !!snapshot.revision
    && (snapshot.profile === null || (!!snapshot.profile && typeof snapshot.profile === 'object'
      && typeof snapshot.profile.id === 'string' && typeof snapshot.profile.updatedAt === 'string'
      && !!snapshot.profile.values && typeof snapshot.profile.values === 'object'));
}

function mapOperation(response: OperationResponse, attemptId: string): ProfileOperationResult {
  if (!response || typeof response !== 'object' || typeof response.kind !== 'string') {
    return { kind: 'unconfirmed', attemptId };
  }
  if ((response.kind === 'success' || response.kind === 'conflict') && !validSnapshot(response.snapshot)) {
    return { kind: 'unconfirmed', attemptId };
  }
  if (response.kind === 'partial-success') {
    if (!validSnapshot(response.snapshot) || !Array.isArray(response.applied) || !response.errors) {
      return { kind: 'unconfirmed', attemptId };
    }
    const errors = fieldErrors({ errors: response.errors as unknown as Record<string, unknown> });
    return { ...response, errors };
  }
  if (response.kind === 'validation-error') {
    return { ...response, errors: fieldErrors({ errors: response.errors as unknown as Record<string, unknown> }) };
  }
  if (response.kind === 'success' || response.kind === 'conflict'
    || response.kind === 'no-changes' || response.kind === 'skipped') return response;
  return { kind: 'unconfirmed', attemptId };
}

function isAttemptReceipt(result: ProfileOperationResult): result is ProfileAttemptReceipt {
  return result.kind !== 'unconfirmed' && result.kind !== 'unauthorized' && result.kind !== 'network-error';
}

function operationFailure(error: unknown, attemptId: string): ProfileOperationResult {
  if (!(error instanceof ApiError)) return { kind: 'unconfirmed', attemptId };
  if (error.status === 401 || error.status === 403) return { kind: 'unauthorized' };
  if (error.status === 422) return { kind: 'validation-error', errors: fieldErrors(error.responseBody ?? {}) };
  if (error.status === 409 || error.status === 412) {
    const snapshot = error.responseBody?.snapshot;
    return validSnapshot(snapshot) ? { kind: 'conflict', snapshot } : { kind: 'unconfirmed', attemptId };
  }
  if (error.status === 0 || error.status >= 500) return { kind: 'unconfirmed', attemptId };
  return { kind: 'network-error' };
}

export class HttpProfileRepository implements ProfileRepository {
  async getMyProfile(attemptId?: string): Promise<ProfileLoadResult> {
    try {
      const query = attemptId ? `?attemptId=${encodeURIComponent(attemptId)}` : '';
      const response = await apiRequest<SnapshotResponse & { attempt?: ProfileAttemptReceipt }>(
        `/me/health-profile${query}`, {}, true,
      );
      if (!validSnapshot(response.snapshot)) return { kind: 'network-error' };
      const attempt = response.attempt ? mapOperation(response.attempt, attemptId ?? '') : undefined;
      return { kind: 'verified', snapshot: response.snapshot, ...(attempt && isAttemptReceipt(attempt) ? { attempt } : {}) };
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return { kind: 'unauthorized' };
      return { kind: 'network-error' };
    }
  }

  async createMyProfile(request: CreateProfileRequest): Promise<ProfileOperationResult> {
    try {
      const response = await apiRequest<OperationResponse>('/me/health-profile', {
        method: 'POST', body: JSON.stringify(request),
      }, true);
      return mapOperation(response, request.attemptId);
    } catch (error) {
      return operationFailure(error, request.attemptId);
    }
  }

  async updateMyProfile(request: UpdateProfileRequest): Promise<ProfileOperationResult> {
    try {
      const response = await apiRequest<OperationResponse>('/me/health-profile', {
        method: 'PATCH', body: JSON.stringify(request),
      }, true);
      return mapOperation(response, request.attemptId);
    } catch (error) {
      return operationFailure(error, request.attemptId);
    }
  }
}
