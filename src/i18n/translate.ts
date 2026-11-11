import type { Language, TranslationMessages, TranslationValues } from './types';

export function translate<Key extends string>(
  language: Language,
  messages: TranslationMessages<Key>,
  key: Key,
  values?: TranslationValues,
): string {
  const message = messages[language][key] ?? messages.en[key] ?? key;
  if (!values) return message;

  return message.replace(/\{([\w]+)\}/g, (placeholder, name: string) => {
    const value = values[name];
    return value === undefined ? placeholder : String(value);
  });
}
