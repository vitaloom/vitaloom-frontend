import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Appearance, Platform, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as SystemUI from 'expo-system-ui';
import * as SplashScreen from 'expo-splash-screen';
import { colors, type ColorScheme } from './colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type AppearancePreference = 'system' | ColorScheme;

const STORAGE_KEY = 'vitaloom.appearance.preference';
const useAppearanceLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const AppearanceContext = createContext<{
  preference: AppearancePreference;
  scheme: ColorScheme;
  ready: boolean;
  setPreference: (preference: AppearancePreference) => Promise<boolean>;
} | null>(null);

if (Platform.OS !== 'web') {
  void SplashScreen.preventAutoHideAsync().catch(() => undefined);
}

async function readPreference(): Promise<AppearancePreference> {
  try {
    const stored = Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(STORAGE_KEY)
      : await SecureStore.getItemAsync(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

async function writePreference(preference: AppearancePreference): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      if (!globalThis.localStorage) return false;
      globalThis.localStorage.setItem(STORAGE_KEY, preference);
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, preference);
    }
    return true;
  } catch {
    return false;
  }
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<AppearancePreference>('system');
  const [ready, setReady] = useState(false);
  const preferenceRef = useRef<AppearancePreference>('system');
  const saveQueue = useRef<Promise<boolean>>(Promise.resolve(true));
  const splashHidden = useRef(false);
  const resolvedSystemScheme: ColorScheme = systemScheme === 'dark' ? 'dark' : 'light';
  const scheme = preference === 'system' ? resolvedSystemScheme : preference;

  useEffect(() => {
    let mounted = true;
    void readPreference().then((stored) => {
      if (!mounted) return;
      preferenceRef.current = stored;
      setPreferenceState(stored);
      if (Platform.OS !== 'web') Appearance.setColorScheme(stored === 'system' ? 'auto' : stored);
      setReady(true);
    });
    return () => { mounted = false; };
  }, []);

  useAppearanceLayoutEffect(() => {
    if (!ready) return;
    if (Platform.OS === 'web') {
      const document = globalThis.document;
      if (document) {
        document.documentElement.style.colorScheme = preference === 'system' ? 'light dark' : scheme;
        document.documentElement.style.backgroundColor = colors[scheme].background;
        if (document.body) document.body.style.backgroundColor = colors[scheme].background;
      }
      return;
    }
    void SystemUI.setBackgroundColorAsync(colors[scheme].background)
      .catch(() => undefined)
      .then(async () => {
        if (splashHidden.current) return;
        splashHidden.current = true;
        await SplashScreen.hideAsync().catch(() => undefined);
      });
  }, [preference, ready, scheme]);

  const setPreference = useCallback((next: AppearancePreference) => {
    preferenceRef.current = next;
    setPreferenceState(next);
    if (Platform.OS !== 'web') Appearance.setColorScheme(next === 'system' ? 'auto' : next);

    const save = saveQueue.current.then(() => writePreference(next));
    saveQueue.current = save;
    return save.then((saved) => saved || preferenceRef.current !== next);
  }, []);

  const value = useMemo(() => ({ preference, scheme, ready, setPreference }), [preference, scheme, ready, setPreference]);
  return <AppearanceContext.Provider value={value}>
    {Platform.OS === 'web' ? (
      <View style={{ flex: 1, backgroundColor: ready ? colors[scheme].background : 'Canvas' }}>
        <View
          style={{ flex: 1, visibility: ready ? 'visible' : 'hidden', backgroundColor: ready ? colors[scheme].background : 'transparent' }}
          pointerEvents={ready ? 'auto' : 'none'}
          accessibilityElementsHidden={!ready}
          importantForAccessibility={ready ? 'auto' : 'no-hide-descendants'}
          aria-hidden={!ready}>
          {children}
        </View>
      </View>
    ) : children}
  </AppearanceContext.Provider>;
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error('useAppearance must be used within AppearanceProvider.');
  return context;
}
