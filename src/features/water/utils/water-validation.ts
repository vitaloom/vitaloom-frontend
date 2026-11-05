import type { CreateWaterLogInput } from '../types/water';
import { parseLocalDate } from './water-date';

export const WATER_GOAL_ML = 2000;

export function validateWaterAmount(amountMl: number): string | null {
  if (!Number.isInteger(amountMl) || amountMl < 1 || amountMl > WATER_GOAL_ML) {
    return 'Lượng nước phải là số nguyên từ 1 đến 2.000 ml.';
  }
  return null;
}

export function isValidWaterAmount(amountMl: number): boolean {
  return validateWaterAmount(amountMl) === null;
}

export function validateCreateWaterLogInput(input: CreateWaterLogInput, now: Date): string | null {
  const amountError = validateWaterAmount(input.amountMl);
  if (amountError) return amountError;

  if (input.source !== 'quick-add' && input.source !== 'custom') return 'Nguồn ghi nhận không hợp lệ.';
  const isoMatch = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.exec(input.loggedAt);
  const isIsoInstant = isoMatch !== null
    && parseLocalDate(isoMatch[1]) !== null
    && Number(isoMatch[2]) <= 23
    && Number(isoMatch[3]) <= 59
    && Number(isoMatch[4] ?? 0) <= 59;
  const timestamp = new Date(input.loggedAt);
  if (!isIsoInstant || Number.isNaN(timestamp.getTime())) return 'Thời điểm ghi nhận không hợp lệ.';
  if (timestamp.getTime() > now.getTime()) return 'Không thể ghi nhận lượng nước vào thời điểm trong tương lai.';
  return null;
}
