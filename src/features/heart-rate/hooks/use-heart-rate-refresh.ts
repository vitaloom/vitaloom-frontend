import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';

/** Re-run a screen's existing query while it is visible, with optional polling. */
export function useHeartRateRefresh(onRefresh: () => void, intervalMs?: number) {
  const [focused, setFocused] = useState(false);
  const active = useRef(AppState.currentState === 'active');
  const visible = useRef(true);
  const lastRefresh = useRef(0);
  const hasFocused = useRef(false);
  const refreshRef = useRef(onRefresh);
  useEffect(() => { refreshRef.current = onRefresh; }, [onRefresh]);

  const refresh = useCallback(() => {
    const now = Date.now();
    // Focus and foreground events can arrive together during resume.
    if (now - lastRefresh.current < 800) return;
    lastRefresh.current = now;
    refreshRef.current();
  }, []);

  useFocusEffect(useCallback(() => {
    setFocused(true);
    // The screen's initial effect already loads once when first mounted.
    if (hasFocused.current && active.current && visible.current) refresh();
    hasFocused.current = true;
    return () => setFocused(false);
  }, [refresh]));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      const resumed = state === 'active' && !active.current;
      active.current = state === 'active';
      if (resumed && focused && visible.current) refresh();
    });
    let removeVisibilityListener: (() => void) | undefined;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const updateVisibility = () => {
        const wasVisible = visible.current;
        visible.current = document.visibilityState === 'visible';
        if (!wasVisible && visible.current && focused && active.current) refresh();
      };
      document.addEventListener('visibilitychange', updateVisibility);
      removeVisibilityListener = () => document.removeEventListener('visibilitychange', updateVisibility);
      visible.current = document.visibilityState === 'visible';
    }
    return () => { subscription.remove(); removeVisibilityListener?.(); };
  }, [focused, refresh]);

  useEffect(() => {
    if (!intervalMs || !focused || !active.current || !visible.current) return;
    const timer = setInterval(() => {
      if (active.current && visible.current) refresh();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [focused, intervalMs, refresh]);

  return refresh;
}
