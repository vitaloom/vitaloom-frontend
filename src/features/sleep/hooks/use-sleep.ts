import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useAuth } from '@/features/auth/store/auth-context';
import { getSleepRepository } from '../api/get-sleep-repository';
import type { SleepRepository } from '../api/sleep-repository';
import type { Mutation, ReadResult, WriteResult } from '../types/sleep';

export function useSleepRepository(): SleepRepository {
  const { user } = useAuth();
  if (!user) throw new Error('Sleep requires the authenticated app stack.');
  return getSleepRepository(user.id);
}

type LoadState<T> = ReadResult<T> | { kind: 'loading' };

export function useSleepRead<T>(read: () => Promise<ReadResult<T>>, key: string, keepPrevious = false) {
  const repository = useSleepRepository();
  const reader = useRef(read);
  const [refresh, setRefresh] = useState(0);
  const [snapshot, setSnapshot] = useState<{
    repository: SleepRepository; key: string; refresh: number; state: LoadState<T>;
  }>();
  useEffect(() => { reader.current = read; }, [read]);

  useFocusEffect(useCallback(() => {
    let active = true;
    let request = 0;
    const load = async () => {
      const id = ++request;
      const current = await Promise.resolve().then(() => reader.current()).catch((): ReadResult<T> => ({
        kind: 'error', message: 'Sleep data could not be loaded. Please try again.',
      }));
      if (active && id === request) setSnapshot({ repository, key, refresh, state: current });
    };
    const unsubscribe = repository.subscribe(() => {
      if (!keepPrevious) setSnapshot(undefined);
      void load();
    });
    void load();
    return () => { active = false; unsubscribe(); };
  }, [repository, key, refresh, keepPrevious]));

  const state: LoadState<T> = snapshot?.repository === repository && snapshot.key === key && snapshot.refresh === refresh
    ? snapshot.state
    : { kind: 'loading' };
  return { state, reload: useCallback(() => setRefresh((value) => value + 1), []) };
}

type Confirmation = Extract<WriteResult, { kind: 'confirmed' }>;
type PendingWrite = { attemptId: string; busy: boolean };
type WriteStore = { pending: Map<string, PendingWrite>; listeners: Set<() => void> };
const writesByRepository = new WeakMap<SleepRepository, WriteStore>();
let attemptSequence = 0;

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

  async function execute(attemptId: string, send: () => Promise<WriteResult>) {
    publish(store, scope, { attemptId, busy: true });
    setResult(null);
    let outcome: WriteResult;
    try {
      outcome = await send();
    } catch {
      outcome = { kind: 'unknown', attemptId };
    }
    publish(store, scope, outcome.kind === 'unknown' ? { attemptId, busy: false } : null);
    if (!mounted.current) return;
    setResult(outcome);
    if (outcome.kind === 'confirmed') confirmed.current(outcome);
  }

  return {
    result: pending && !pending.busy ? { kind: 'unknown' as const, attemptId: pending.attemptId } : result,
    busy: Boolean(pending?.busy),
    run(mutation: Mutation) {
      if (store.pending.has(scope)) return;
      const attemptId = `sleep-${Date.now()}-${++attemptSequence}`;
      void execute(attemptId, () => repository.mutate(attemptId, mutation));
    },
    reconcile() {
      const attempt = store.pending.get(scope);
      if (attempt && !attempt.busy) void execute(attempt.attemptId, () => repository.reconcile(attempt.attemptId));
    },
    clear() { setResult(null); },
  };
}
