import type { CatalogSleepInsightCode } from '../types/sleep';
import type { sleepMessages } from '../messages';

type GoalInsightCode = Extract<CatalogSleepInsightCode, 'A02' | 'B04'>;
type Translate = (
  key: keyof typeof sleepMessages.en,
  values?: Record<string, string | number>,
) => string;

function count(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

export function sleepGoalInsightCopy(
  code: GoalInsightCode,
  sampleValue: unknown,
  evidenceValue: unknown,
  t: Translate,
): { title: string; summary?: string } {
  const sample = record(sampleValue);
  const evidence = record(evidenceValue);
  if (code === 'A02') {
    const eligible = count(sample?.eligibleMainDays);
    const met = count(evidence?.metGoalDays);
    const evidenceEligible = count(evidence?.eligibleMainDays);
    return {
      title: t('goalInsightA02Title'),
      ...(eligible !== null && eligible >= 3 && met !== null && met <= eligible && evidenceEligible === eligible
        ? { summary: t('goalInsightA02Summary', { met, eligible }) } : {}),
    };
  }

  const rated = count(sample?.ratedMain);
  const comparable = count(sample?.comparableRatedMain);
  const evidenceRated = count(evidence?.ratedMain);
  const exceptions = count(evidence?.exceptionCount);
  return {
    title: t('goalInsightB04Title'),
    ...(rated !== null && rated >= 3 && comparable !== null && comparable <= rated
      && evidenceRated === rated && exceptions !== null && exceptions >= 1 && exceptions <= comparable
      && Array.isArray(evidence?.exceptions) && evidence.exceptions.length === exceptions
      ? { summary: t('goalInsightB04Summary', { exceptions, rated }) } : {}),
  };
}
