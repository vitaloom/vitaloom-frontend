import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiError, resetApiSession, setAccessToken, setRefreshHandler } from '@/lib/api/http-client';
import { authStorage } from '@/lib/storage/auth-storage';
import { authApi } from '../api/auth-api';
import type { AuthStatus, AuthTokens, AuthUser, RegisterResult } from '../types/auth';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

type ProfileInvitationDecision = 'skipped' | 'completed';

const invitationDecisionMemory = new Map<string, ProfileInvitationDecision>();
const invitationDecisionKey = (userId: string) => {
  const hex = userId.split('').map((unit) => unit.charCodeAt(0).toString(16).padStart(4, '0')).join('');
  return `vitaloom.profile-invitation.${hex}`;
};

async function loadProfileInvitationDecision(userId: string): Promise<ProfileInvitationDecision | null> {
  const cached = invitationDecisionMemory.get(userId);
  if (cached) return cached;
  try {
    const stored = Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(invitationDecisionKey(userId))
      : await SecureStore.getItemAsync(invitationDecisionKey(userId));
    if (stored === 'skipped' || stored === 'completed') {
      invitationDecisionMemory.set(userId, stored);
      return stored;
    }
  } catch {
    // Keep the invitation decision usable in memory if platform storage is unavailable.
  }
  return null;
}

async function saveProfileInvitationDecision(userId: string, decision: ProfileInvitationDecision) {
  invitationDecisionMemory.set(userId, decision);
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(invitationDecisionKey(userId), decision);
    else await SecureStore.setItemAsync(invitationDecisionKey(userId), decision);
  } catch {
    // This is local invitation metadata, never profile data. Session state remains resolved.
  }
}

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<RegisterResult>;
  signOut: () => Promise<void>;
  retryRestore: () => Promise<void>;
  pendingProfileInvitation: boolean;
  resolveProfileInvitation: (decision: ProfileInvitationDecision) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pendingProfileInvitation, setPendingProfileInvitation] = useState(false);
  const refreshTokenRef = useRef<string | null>(null);
  const generationRef = useRef(0);

  const updateProfileInvitation = useCallback(async (authenticatedUser: AuthUser, expectedGeneration: number) => {
    const decision = await loadProfileInvitationDecision(authenticatedUser.id);
    if (generationRef.current === expectedGeneration) setPendingProfileInvitation(decision === null);
  }, []);

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
        resetApiSession();
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
        resetApiSession();
        setUser(null);
        setStatus('unauthenticated');
        return;
      }
      refreshTokenRef.current = storedToken;
      await refreshAccess(generation);
      const currentUser = await authApi.me();
      if (generationRef.current !== generation) return;
      setUser(currentUser);
      await updateProfileInvitation(currentUser, generation);
      if (generationRef.current !== generation) return;
      setStatus('authenticated');
    } catch {
      if (generationRef.current !== generation) return;
      // A /me failure does not prove the saved refresh token is invalid.
      // refreshAccess already clears a definitively rejected refresh token.
      setStatus('temporarilyUnavailable');
    }
  }, [refreshAccess, updateProfileInvitation]);

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
    resetApiSession();
    setAccessToken(tokens.accessToken);
    setUser(tokens.user);
    await updateProfileInvitation(tokens.user, generation);
    if (generationRef.current !== generation) return;
    setStatus('authenticated');
  }, [updateProfileInvitation]);

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
    resetApiSession();
    setUser(null);
    setPendingProfileInvitation(false);
    setStatus('unauthenticated');
    await authStorage.clear();
  }, []);

  const resolveProfileInvitation = useCallback(async (decision: ProfileInvitationDecision) => {
    const currentUser = user;
    const generation = generationRef.current;
    if (status !== 'authenticated' || !currentUser) return;
    await saveProfileInvitationDecision(currentUser.id, decision);
    if (generationRef.current === generation && user?.id === currentUser.id) setPendingProfileInvitation(false);
  }, [status, user]);
  const value = useMemo(() => ({ status, user, signIn, register, signOut, retryRestore: restore, pendingProfileInvitation, resolveProfileInvitation }), [status, user, signIn, register, signOut, restore, pendingProfileInvitation, resolveProfileInvitation]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
