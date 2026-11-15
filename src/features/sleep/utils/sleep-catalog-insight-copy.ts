import type { CatalogSleepInsightCode } from '../types/sleep';

type Translate = (key: 'insightA04Title' | 'insightA04Summary' | 'insightA05Title'
  | 'insightA05Summary' | 'insightB02Title' | 'insightB02Summary') => string;

export function sleepCatalogInsightCopy(code: CatalogSleepInsightCode, t: Translate) {
  if (code === 'A04') return { title: t('insightA04Title'), summary: t('insightA04Summary') };
  if (code === 'A05') return { title: t('insightA05Title'), summary: t('insightA05Summary') };
  if (code === 'B02') return { title: t('insightB02Title'), summary: t('insightB02Summary') };
  return null;
}
