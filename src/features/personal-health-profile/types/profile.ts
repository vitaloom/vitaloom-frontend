/** Canonical field order for profile forms, snapshots, and mock scenarios. */
export const profileFields = [
  'displayName',
  'birthYear',
  'gender',
  'heightCm',
  'weightKg',
  'activityLevel',
] as const;

export type ProfileField = (typeof profileFields)[number];
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';

export type ProfileValues = {
  displayName: string;
  birthYear: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
};

export type ProfileDto = {
  id: string;
  values: Partial<ProfileValues>;
  updatedAt: string;
};

/** Revision belongs to the account aggregate, including when no profile exists. */
export type ProfileSnapshot = {
  profile: ProfileDto | null;
  revision: string;
};

/** Text input keeps malformed values available for correction. */
export type ProfileDraft = Record<ProfileField, string>;
export type ProfileFieldErrors = Partial<Record<ProfileField, string>>;
export type ProfilePatch = Partial<Record<ProfileField, string | null>>;

export type CreateProfileRequest = {
  fields: Partial<ProfileDraft>;
  attemptId: string;
};

export type UpdateProfileRequest = {
  patch: ProfilePatch;
  expectedRevision: string;
  attemptId: string;
};

export const basicFields = ['displayName', 'birthYear', 'gender'] as const satisfies readonly ProfileField[];
export const lifestyleFields = ['heightCm', 'weightKg', 'activityLevel'] as const satisfies readonly ProfileField[];

export const fieldLabels = {
  displayName: 'Display name',
  birthYear: 'Birth year',
  gender: 'Gender',
  heightCm: 'Height',
  weightKg: 'Weight',
  activityLevel: 'Activity level',
} as const satisfies Record<ProfileField, string>;

export const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const satisfies readonly { value: Gender; label: string }[];

export const activityOptions = [
  { value: 'sedentary', label: 'Mostly seated', description: 'Around 0–2 active days per week' },
  { value: 'lightly_active', label: 'Lightly active', description: 'Around 3–4 active days per week' },
  { value: 'moderately_active', label: 'Moderately active', description: 'Around 5–6 active days per week' },
  { value: 'very_active', label: 'Very active', description: 'Almost daily or physically demanding work' },
] as const satisfies readonly { value: ActivityLevel; label: string; description: string }[];

export type ProfileAttemptReceipt =
  | { kind: 'success'; snapshot: ProfileSnapshot }
  | { kind: 'partial-success'; snapshot: ProfileSnapshot; applied: ProfileField[]; errors: ProfileFieldErrors }
  | { kind: 'validation-error'; errors: ProfileFieldErrors }
  | { kind: 'conflict'; snapshot: ProfileSnapshot }
  | { kind: 'not-applied' }
  | { kind: 'skipped' }
  | { kind: 'no-changes' };

export type ProfileOperationResult = ProfileAttemptReceipt
  | { kind: 'unconfirmed'; attemptId: string }
  | { kind: 'unauthorized' }
  | { kind: 'network-error' };

export type ProfileLoadResult =
  | { kind: 'verified'; snapshot: ProfileSnapshot; attempt?: ProfileAttemptReceipt }
  | { kind: 'network-error' }
  | { kind: 'unauthorized' };
