import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { Language } from './types';

const LANGUAGE_STORAGE_KEY = 'vitaloom.language';
const LOCALES: Record<Language, string> = { en: 'en-US', vi: 'vi-VN' };

type I18nContextValue = {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => Promise<boolean>;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getDeviceLanguage(): Language {
  try {
    const locale = Platform.OS === 'web' && typeof navigator !== 'undefined'
      ? navigator.language
      : Intl.DateTimeFormat().resolvedOptions().locale;
    return locale.toLowerCase().startsWith('vi') ? 'vi' : 'en';
  } catch {
    return 'en';
  }
}

async function readStoredLanguage(): Promise<Language | null> {
  try {
    const stored = Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(LANGUAGE_STORAGE_KEY)
      : await SecureStore.getItemAsync(LANGUAGE_STORAGE_KEY);
    return stored === 'vi' || stored === 'en' ? stored : null;
  } catch {
    return null;
  }
}

async function writeStoredLanguage(language: Language): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      if (!globalThis.localStorage) return false;
      globalThis.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } else {
      await SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, language);
    }
    return true;
  } catch {
    return false;
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const languageRef = useRef<Language>('en');
  const languageChanged = useRef(false);
  const saveQueue = useRef<Promise<boolean>>(Promise.resolve(true));

  useEffect(() => {
    let mounted = true;
    void readStoredLanguage().then((stored) => {
      if (!mounted || languageChanged.current) return;
      const initial = stored ?? getDeviceLanguage();
      languageRef.current = initial;
      setLanguageState(initial);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const document = globalThis.document;
    if (document) document.documentElement.lang = LOCALES[language];
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    languageChanged.current = true;
    languageRef.current = next;
    setLanguageState(next);
    const save = saveQueue.current.then(() => writeStoredLanguage(next));
    saveQueue.current = save;
    return save.then((saved) => saved || languageRef.current !== next);
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    language,
    locale: LOCALES[language],
    setLanguage,
  }), [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider.');
  return context;
}
