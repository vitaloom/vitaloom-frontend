import { useCallback } from 'react';
import { translate } from './translate';
import { useI18n } from './i18n-provider';
import type { TranslationMessages, TranslationValues } from './types';

export function useTranslations<Key extends string>(messages: TranslationMessages<Key>) {
  const { language } = useI18n();
  return useCallback((key: Key, values?: TranslationValues) => (
    translate(language, messages, key, values)
  ), [language, messages]);
}
