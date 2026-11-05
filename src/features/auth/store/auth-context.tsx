import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiError, setAccessToken, setRefreshHandler } from '@/lib/api/http-client';
import { authStorage } from '@/lib/storage/auth-storage';
import { authApi } from '../api/auth-api';
import type { AuthStatus, AuthTokens, AuthUser, RegisterResult } from '../types/auth';

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<RegisterResult>;
  signOut: () => Promise<void>;
  retryRestore: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [user, setUser] = useState<AuthUser | null>(null);
  const refreshTokenRef = useRef<string | null>(null);
  const generationRef = useRef(0);

  const refreshAccess = useCallback(async (expectedGeneration: number) => {
    const refreshToken = refreshTokenRef.current;
    if (!refreshToken) throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Please sign in again.');
    try {
      const result = await authApi.refresh(refreshToken);
      if (generationRef.current !== expectedGeneration) throw new Error('Session changed while refreshing.');
      setAccessToken(result.accessToken);
      return result.accessToken;
    } catch (error) {
      if (generationRef.current !== expectedGeneration) throw error;
      if (error instanceof ApiError && error.status === 401) {
        generationRef.current += 1;
        refreshTokenRef.current = null;
        setAccessToken(null);
        setUser(null);
        await authStorage.clear().catch(() => undefined);
        setStatus('unauthenticated');
      } else {
        setStatus('temporarilyUnavailable');
      }
      throw error;
    }
  }, []);

  const restore = useCallback(async () => {
    setStatus((current) => current === 'authenticated' ? current : 'checking');
    const generation = generationRef.current;
    try {
      const storedToken = await authStorage.getRefreshToken();
      if (generationRef.current !== generation) return;
      if (!storedToken) {
        refreshTokenRef.current = null;
        setAccessToken(null);
        setUser(null);
        setStatus('unauthenticated');
        return;
      }
      refreshTokenRef.current = storedToken;
      await refreshAccess(generation);
      const currentUser = await authApi.me();
      if (generationRef.current !== generation) return;
      setUser(currentUser);
      setStatus('authenticated');
    } catch {
      if (generationRef.current !== generation) return;
      // A /me failure does not prove the saved refresh token is invalid.
      // refreshAccess already clears a definitively rejected refresh token.
      setStatus('temporarilyUnavailable');
    }
  }, [refreshAccess]);

  useEffect(() => {
    setRefreshHandler(() => refreshAccess(generationRef.current));
    void Promise.resolve().then(restore);
    return () => setRefreshHandler(null);
  }, [refreshAccess, restore]);

  const acceptTokens = useCallback(async (tokens: AuthTokens, expectedGeneration: number) => {
    if (generationRef.current !== expectedGeneration) return;
    const generation = ++generationRef.current;
    refreshTokenRef.current = tokens.refreshToken;
    await authStorage.saveRefreshToken(tokens.refreshToken);
    if (generation !== generationRef.current) return;
    setAccessToken(tokens.accessToken);
    setUser(tokens.user);
    setStatus('authenticated');
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const generation = generationRef.current;
    const tokens = await authApi.login({ email: email.trim().toLowerCase(), password });
    await acceptTokens(tokens, generation);
  }, [acceptTokens]);

  const register = useCallback(async (email: string, password: string) => {
    const generation = generationRef.current;
    const result = await authApi.register({ email: email.trim().toLowerCase(), password });
    if ('refreshToken' in result) await acceptTokens(result, generation);
    return result;
  }, [acceptTokens]);

  const signOut = useCallback(async () => {
    generationRef.current += 1;
    refreshTokenRef.current = null;
    setAccessToken(null);
    setUser(null);
    setStatus('unauthenticated');
    await authStorage.clear();
  }, []);

  const value = useMemo(() => ({ status, user, signIn, register, signOut, retryRestore: restore }), [status, user, signIn, register, signOut, restore]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
