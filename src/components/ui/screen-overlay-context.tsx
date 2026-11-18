import { useFocusEffect } from 'expo-router';
import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';

const ScreenOverlayContext = createContext<{ blocked: boolean; register: () => () => void } | null>(null);

export function ScreenOverlayProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const register = useCallback(() => {
    setCount(current => current + 1);
    return () => setCount(current => current - 1);
  }, []);
  return <ScreenOverlayContext.Provider value={{ blocked: count > 0, register }}>
    {children}
  </ScreenOverlayContext.Provider>;
}

export function useScreenOverlay(open: boolean) {
  const register = useContext(ScreenOverlayContext)?.register;
  useFocusEffect(useCallback(() => {
    if (open) return register?.();
  }, [open, register]));
}

export function useScreenOverlayBlocked() {
  return useContext(ScreenOverlayContext)?.blocked ?? false;
}
