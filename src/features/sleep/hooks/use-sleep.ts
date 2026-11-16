import { uuid } from 'expo';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import { useAuth } from '@/features/auth/store/auth-context';
import { getSleepRepository, sleepFixturesEnabled } from '../api/get-sleep-repository';
import type { SleepRepository } from '../api/sleep-repository';
import type { Mutation, ReadResult, WriteResult } from '../types/sleep';

export function useSleepRepository(): SleepRepository {
  const { user } = useAuth();
  if (!user) throw new Error('Sleep requires the authenticated app stack.');
  return getSleepRepository(user.id);
}

type LoadState<T> = ReadResult<T> | { kind: 'loading' };

export function useSleepRead<T>(read: () => Promise<ReadResult<T>>, key: string, keepPrevious = false, clearOnBlur = false) {
  const repository = useSleepRepository();
  const today = repository.getContext().today;
  const reader = useRef(read);
  const [refresh, setRefresh] = useState(0);
  const [snapshot, setSnapshot] = useState<{
    repository: SleepRepository; key: string; day: string; refresh: number; state: LoadState<T>;
  }>();
  useEffect(() => { reader.current = read; }, [read]);

  useFocusEffect(useCallback(() => {
    let active = true;
    let request = 0;
    const load = async (day = repository.getContext().today) => {
      const id = ++request;
      if (!keepPrevious) setSnapshot(undefined);
      const current = await Promise.resolve().then(() => reader.current()).catch((): ReadResult<T> => ({
        kind: 'error', message: 'Sleep data could not be loaded. Please try again.',
      }));
      if (active && id === request) {
        if (day !== repository.getContext().today) { void load(); return; }
        setSnapshot({ repository, key, day, refresh, state: current });
      }
    };
    const unsubscribe = repository.subscribe(() => {
      if (!keepPrevious) setSnapshot(undefined);
      void load();
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (Platform.OS === 'web') return;
      if (state === 'active') void load();
      else { request += 1; if (clearOnBlur) setSnapshot(undefined); }
    });
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void load();
      else { request += 1; if (clearOnBlur) setSnapshot(undefined); }
    };
    const onWindowBlur = () => { request += 1; if (clearOnBlur) setSnapshot(undefined); };
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('focus', onVisibility);
      window.addEventListener('blur', onWindowBlur);
    }
    void load(today);
    return () => {
      active = false;
      unsubscribe();
      appState.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('focus', onVisibility);
        window.removeEventListener('blur', onWindowBlur);
      }
      if (clearOnBlur) setSnapshot(undefined);
    };
  }, [repository, key, today, refresh, keepPrevious, clearOnBlur]));

  const state: LoadState<T> = snapshot?.repository === repository && snapshot.key === key && snapshot.day === today && snapshot.refresh === refresh
    ? snapshot.state
    : { kind: 'loading' };
  return { state, reload: useCallback(() => setRefresh((value) => value + 1), []) };
}

type Confirmation = Extract<WriteResult, { kind: 'confirmed' }>;

export function useSleepSessionMutation(onConfirmed: (result: Confirmation) => void) {
  const repository = useSleepRepository();
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<WriteResult | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function run(mutation: Extract<Mutation, { kind: 'create-session' | 'update-session' | 'delete-session' }>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setResult(null);
    try {
      const outcome = await repository.mutate(sleepFixturesEnabled() ? uuid.v4() : '', mutation);
      if (!mounted.current) return;
      if (outcome.kind === 'confirmed') onConfirmed(outcome);
      else setResult(outcome.kind === 'unknown'
        ? { kind: 'rejected', message: 'Could not confirm the change. Reload your records before trying again.' }
        : outcome);
    } catch {
      if (mounted.current) setResult({ kind: 'rejected', message: 'Could not save the change. Reload your records before trying again.' });
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return { busy, result, run, clear: () => setResult(null) };
}

type PendingWrite = { attemptId: string; kind: Mutation['kind']; busy: boolean };
type WriteStore = { pending: Map<string, PendingWrite>; listeners: Set<() => void> };
const writesByRepository = new WeakMap<SleepRepository, WriteStore>();

function writeStore(repository: SleepRepository): WriteStore {
  const existing = writesByRepository.get(repository);
  if (existing) return existing;
  const store = { pending: new Map<string, PendingWrite>(), listeners: new Set<() => void>() };
  writesByRepository.set(repository, store);
  return store;
}

function publish(store: WriteStore, scope: string, pending: PendingWrite | null) {
  if (pending) store.pending.set(scope, pending);
  else store.pending.delete(scope);
  for (const listener of store.listeners) listener();
}

export function useSleepMutation(onConfirmed: (result: Confirmation) => void, scope = 'sleep') {
  const repository = useSleepRepository();
  const store = writeStore(repository);
  const confirmed = useRef(onConfirmed);
  const mounted = useRef(true);
  const [result, setResult] = useState<WriteResult | null>(null);
  useEffect(() => { confirmed.current = onConfirmed; }, [onConfirmed]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const subscribe = useCallback((listener: () => void) => {
    store.listeners.add(listener);
    return () => { store.listeners.delete(listener); };
  }, [store]);
  const pending = useSyncExternalStore(subscribe, () => store.pending.get(scope) ?? null, () => null);

  async function execute(attemptId: string, kind: Mutation['kind'], send: () => Promise<WriteResult>) {
    publish(store, scope, { attemptId, kind, busy: true });
    setResult(null);
    let outcome: WriteResult;
    try {
      outcome = await send();
    } catch {
      outcome = { kind: 'unknown', attemptId };
    }
    publish(store, scope, outcome.kind === 'unknown' ? { attemptId, kind, busy: false } : null);
    if (!mounted.current) return;
    setResult(outcome);
    if (outcome.kind === 'confirmed') confirmed.current(outcome);
  }

  return {
    result: pending && !pending.busy ? { kind: 'unknown' as const, attemptId: pending.attemptId } : result,
    busy: Boolean(pending?.busy),
    pendingKind: pending?.kind,
    run(mutation: Mutation) {
      if (store.pending.has(scope)) return;
      const attemptId = uuid.v4();
      void execute(attemptId, mutation.kind, () => repository.mutate(attemptId, mutation));
    },
    reconcile() {
      const attempt = store.pending.get(scope);
      if (attempt && !attempt.busy) void execute(attempt.attemptId, attempt.kind, () => repository.reconcile(attempt.attemptId));
    },
    clear() { setResult(null); },
  };
}
