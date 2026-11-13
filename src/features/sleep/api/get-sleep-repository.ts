import { apiRequest, getApiSessionGeneration } from '../../../lib/api/http-client';
import { MockSleepRepository, type SleepScenario } from '../mocks/mock-sleep-repository';
import { HttpSleepRepository } from './http-sleep-repository';
import type { SleepRepository } from './sleep-repository';

let current: { key: string; generation: number; repository: SleepRepository } | undefined;
const scenarios: SleepScenario[] = ['populated', 'empty', 'no-goal', 'insufficient', 'unverified', 'stale', 'ai-unavailable', 'network-error'];

export function sleepFixturesEnabled(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ && process.env.EXPO_PUBLIC_SLEEP_MODE === 'mock';
}

export function getSleepRepository(accountKey: string): SleepRepository {
  const key = accountKey.trim();
  if (!key) throw new Error('A signed-in account is required for Sleep.');
  const generation = getApiSessionGeneration();
  if (current?.key === key && current.generation === generation) return current.repository;
  const requested = process.env.EXPO_PUBLIC_SLEEP_SCENARIO as SleepScenario | undefined;
  const scenario = requested && scenarios.includes(requested) ? requested : 'populated';
  const repository = sleepFixturesEnabled()
    ? new MockSleepRepository(key, { scenario })
    : new HttpSleepRepository((path, init, authenticated) => apiRequest(path, init, authenticated, generation));
  current = { key, generation, repository };
  return repository;
}
