export type Language = 'vi' | 'en';

export type TranslationMessages<Key extends string = string> = {
  en: Record<Key, string>;
  vi: Record<Key, string>;
};

export type TranslationValues = Record<string, string | number>;
