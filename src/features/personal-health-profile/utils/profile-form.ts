import {
  activityOptions,
  genderOptions,
  profileFields,
  type ProfileDraft,
  type ProfileField,
  type ProfileFieldErrors,
  type ProfileSnapshot,
  type ProfileValues,
} from '../types/profile';

export function draftFromSnapshot(snapshot?: ProfileSnapshot): ProfileDraft {
  const values = snapshot?.profile?.values;
  return Object.fromEntries(profileFields.map((field) => {
    const value = values?.[field];
    return [field, value === undefined ? '' : String(value)];
  })) as ProfileDraft;
}

export function createFields(draft: Partial<ProfileDraft>): Partial<ProfileDraft> {
  return Object.fromEntries(profileFields
    .filter((field) => draft[field] !== undefined && draft[field]!.length > 0)
    .map((field) => [field, draft[field]])) as Partial<ProfileDraft>;
}

const enumValues: Record<'gender' | 'activityLevel', readonly string[]> = {
  gender: genderOptions.map((option) => option.value),
  activityLevel: activityOptions.map((option) => option.value),
};

export function validateCreateFields(fields: Partial<ProfileDraft>, year = new Date().getFullYear()): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  for (const field of profileFields) {
    const value = fields[field];
    if (value === undefined || value === '') continue;
    if (field === 'displayName' && (value.trim().length < 1 || value.trim().length > 50)) {
      errors[field] = 'Enter a display name from 1 to 50 characters.';
    } else if (field === 'birthYear' && (!/^\d+$/.test(value.trim()) || Number(value) < 1900 || Number(value) > year)) {
      errors[field] = `Enter a whole year from 1900 to ${year}.`;
    } else if (field === 'heightCm' || field === 'weightKg') {
      const number = parseMeasurement(value);
      if (field === 'heightCm' && (number === undefined || number < 20 || number > 300)) {
        errors[field] = 'Enter a height from 20 to 300 cm.';
      }
      if (field === 'weightKg' && (number === undefined || number < 0.3 || number > 500)) {
        errors[field] = 'Enter a weight from 0.3 to 500 kg.';
      }
    } else if ((field === 'gender' || field === 'activityLevel') && !enumValues[field].includes(value)) {
      errors[field] = 'Choose one of the available options.';
    }
  }
  return errors;
}

export function parseMeasurement(value: string): number | undefined {
  const text = value.trim();
  if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text)) return undefined;
  const parsed = Number(text.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalize(field: ProfileField, value: string): string {
  if (field === 'displayName') return value.trim();
  if (field === 'birthYear') return String(Number(value));
  if (field === 'heightCm' || field === 'weightKg') return String(parseMeasurement(value));
  return value;
}

export function buildPatch(
  draft: ProfileDraft,
  base: ProfileSnapshot,
  touched: ReadonlySet<ProfileField>,
): Partial<Record<ProfileField, string | null>> {
  const patch: Partial<Record<ProfileField, string | null>> = {};
  const values = base.profile?.values;
  for (const field of profileFields) {
    if (!touched.has(field)) continue;
    const text = draft[field];
    const current = values?.[field];
    if (text === '') {
      if (current !== undefined) patch[field] = null;
    } else if (validateCreateFields({ [field]: text })[field]
      || normalize(field, text) !== (current === undefined ? '' : String(current))) {
      patch[field] = text;
    }
  }
  return patch;
}

export function formatProfileValue(field: ProfileField, values: Partial<ProfileValues>): string {
  const value = values[field];
  if (value === undefined) return 'Not added';
  if (field === 'gender') return genderOptions.find((option) => option.value === value)?.label ?? 'Not added';
  if (field === 'activityLevel') return activityOptions.find((option) => option.value === value)?.label ?? 'Not added';
  if (field === 'heightCm') return `${value} cm`;
  if (field === 'weightKg') return `${value} kg`;
  return String(value);
}
