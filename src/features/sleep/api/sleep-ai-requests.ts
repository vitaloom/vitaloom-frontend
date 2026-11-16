import type { SleepRepository } from './sleep-repository';
import type { ReadResult } from '../types/sleep';

type Pending = { day: string; revision: number; response: Promise<ReadResult<unknown>> };
type Requests = { revision: number; pending: Map<string, Pending> };
const sessions = new WeakMap<SleepRepository, Requests>();

function session(repository: SleepRepository): Requests {
  let value = sessions.get(repository);
  if (!value) {
    value = { revision: 0, pending: new Map() };
    sessions.set(repository, value);
    const store = value;
    repository.subscribe(() => {
      store.revision += 1;
      store.pending.clear();
    });
  }
  return value;
}

// Only pending work is shared. Completed output must be revalidated by the server
// on the next focus/tap, rather than becoming a second client-side AI cache.
export function pendingSleepAi<T>(repository: SleepRepository, key: string): Promise<ReadResult<T>> | undefined {
  const store = session(repository);
  const pending = store.pending.get(key);
  return pending?.day === repository.getContext().today && pending.revision === store.revision
    ? pending.response as Promise<ReadResult<T>> : undefined;
}

export function requestSleepAi<T>(repository: SleepRepository, key: string,
  read: () => Promise<ReadResult<T>>): Promise<ReadResult<T>> {
  const existing = pendingSleepAi<T>(repository, key);
  if (existing) return existing;
  const store = session(repository);
  const day = repository.getContext().today;
  const revision = store.revision;
  const response = Promise.resolve().then(read).then((result): ReadResult<T> =>
    day === repository.getContext().today && revision === store.revision ? result
      : { kind: 'error', code: 'STALE', message: 'Sleep evidence changed.' },
  (): ReadResult<T> => ({ kind: 'error', message: 'Sleep AI is unavailable.' }));
  const pending = { day, revision, response };
  store.pending.set(key, pending);
  void response.then(() => {
    if (store.pending.get(key) === pending) store.pending.delete(key);
  });
  return response;
}
