import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useAuth } from '@/features/auth/store/auth-context';
import { getApiSessionGeneration } from '@/lib/api/http-client';

import { assistantSettingsApi } from './assistant-course-api';

type AccessStatus = 'loading' | 'ready' | 'saving' | 'error';
type AssistantAccess = {
  accountId: string | undefined;
  status: AccessStatus;
  personalDataAllowed: boolean;
  version: number;
  refresh: () => Promise<void>;
  update: (allowed: boolean) => Promise<boolean>;
};

const AssistantAccessContext = createContext<AssistantAccess | null>(null);

export function AssistantAccessProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, user } = useAuth();
  const accountId = authStatus === 'authenticated' ? user?.id : undefined;
  const [settings, setSettings] = useState<{ accountId?: string; status: AccessStatus; allowed: boolean; version: number }>({
    status: 'loading', allowed: false, version: 0,
  });
  const request = useRef<AbortController | null>(null);
  const version = useRef(0);
  const updating = useRef(false);
  const locallyDisabledAccounts = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    if (updating.current) return;
    const currentAccount = accountId;
    const session = getApiSessionGeneration();
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setSettings({ accountId: currentAccount, status: currentAccount ? 'loading' : 'ready',
      allowed: false, version: version.current });
    if (!currentAccount) {
      request.current = null;
      return;
    }
    try {
      const result = await assistantSettingsApi(session, controller.signal).get();
      if (request.current === controller && !controller.signal.aborted && session === getApiSessionGeneration()) {
        const allowed = result.personalDataAllowed && !locallyDisabledAccounts.current.has(currentAccount);
        setSettings({ accountId: currentAccount, status: 'ready', allowed, version: version.current });
        request.current = null;
      }
    } catch {
      if (request.current === controller && !controller.signal.aborted && session === getApiSessionGeneration()) {
        setSettings({ accountId: currentAccount, status: 'error', allowed: false, version: version.current });
        request.current = null;
      }
    }
  }, [accountId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) return refresh(); });
    return () => {
      active = false;
      request.current?.abort();
      request.current = null;
      updating.current = false;
    };
  }, [refresh]);

  const update = useCallback(async (allowed: boolean) => {
    if (!accountId || settings.accountId !== accountId || settings.status !== 'ready' || request.current) return false;
    if (!allowed) locallyDisabledAccounts.current.add(accountId);
    const session = getApiSessionGeneration();
    const controller = new AbortController();
    request.current = controller;
    updating.current = true;
    const nextVersion = version.current + 1;
    version.current = nextVersion;
    setSettings({ accountId, status: 'saving', allowed: false, version: nextVersion });
    try {
      const result = await assistantSettingsApi(session, controller.signal).update(allowed);
      if (request.current !== controller || controller.signal.aborted || session !== getApiSessionGeneration()) return false;
      if (result.personalDataAllowed !== allowed) throw new Error('Assistant access setting was not applied.');
      if (allowed) locallyDisabledAccounts.current.delete(accountId);
      setSettings({ accountId, status: 'ready', allowed: result.personalDataAllowed, version: nextVersion });
      updating.current = false;
      request.current = null;
      return true;
    } catch {
      if (request.current === controller && !controller.signal.aborted && session === getApiSessionGeneration()) {
        setSettings({ accountId, status: 'error', allowed: false, version: nextVersion });
        updating.current = false;
        request.current = null;
      }
      return false;
    }
  }, [accountId, settings.accountId, settings.status]);

  const value = useMemo<AssistantAccess>(() => ({
    accountId,
    status: settings.accountId === accountId ? settings.status : 'loading',
    personalDataAllowed: settings.accountId === accountId && settings.status === 'ready' && settings.allowed,
    version: settings.accountId === accountId ? settings.version : -1,
    refresh,
    update,
  }), [accountId, refresh, settings, update]);

  return <AssistantAccessContext.Provider value={value}>{children}</AssistantAccessContext.Provider>;
}

export function useAssistantAccess() {
  const context = useContext(AssistantAccessContext);
  if (!context) throw new Error('useAssistantAccess must be used within AssistantAccessProvider.');
  return context;
}
