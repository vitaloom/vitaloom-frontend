import type { CatalogSleepInsightCode } from '../types/sleep';
import type { sleepMessages } from '../messages';

type TrendCode = Extract<CatalogSleepInsightCode, 'A03' | 'B03'>;
type Translate = (key: keyof typeof sleepMessages.en, values?: Record<string, string | number>) => string;

export function formatSignedSleepMinutes(minutes: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'unit', unit: 'minute', unitDisplay: 'long', signDisplay: 'exceptZero',
  }).format(minutes);
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

export function sleepTrendInsightCopy(
  code: TrendCode,
  sampleValue: unknown,
  evidenceValue: unknown,
  t: Translate,
  locale: string,
): { title: string; summary: string } {
  const sample = record(sampleValue);
  const evidence = record(evidenceValue);
  if (code === 'A03') {
    const baseline = record(evidence?.baseline);
    const recent = record(evidence?.recent);
    const delta = evidence?.deltaMinutes;
    const baselineDays = sample?.baselineMainDays;
    const recentDays = sample?.recentMainDays;
    const baselineMean = baseline?.meanMinutes;
    const recentMean = recent?.meanMinutes;
    const valid = Number.isSafeInteger(delta) && Number.isSafeInteger(baseline?.meanMinutes)
      && Number.isSafeInteger(recent?.meanMinutes) && Number.isSafeInteger(baselineDays)
      && Number.isSafeInteger(recentDays) && recentMean === Number(baselineMean) + Number(delta);
    return { title: t('trendA03Title'), summary: valid
      ? t('trendA03Summary', { delta: formatSignedSleepMinutes(Number(delta), locale), baselineDays: Number(baselineDays), recentDays: Number(recentDays) })
      : t('trendA03Generic') };
  }
  return { title: t('trendB03Title'), summary: t('trendB03Summary') };
}
