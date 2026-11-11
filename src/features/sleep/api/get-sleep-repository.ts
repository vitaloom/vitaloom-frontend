import { MockSleepRepository, type SleepScenario } from '../mocks/mock-sleep-repository';
import type { SleepRepository } from './sleep-repository';

const repositories = new Map<string, SleepRepository>();
const scenarios: SleepScenario[] = ['populated', 'empty', 'no-goal', 'insufficient', 'unverified', 'stale', 'ai-unavailable'];

export function getSleepRepository(accountKey: string): SleepRepository {
  const key = accountKey.trim();
  if (!key) throw new Error('A signed-in account key is required for the Sleep mock.');
  const cached = repositories.get(key);
  if (cached) return cached;
  const requested = typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_SLEEP_SCENARIO : undefined;
  const scenario = __DEV__ && requested && scenarios.includes(requested as SleepScenario) ? requested as SleepScenario : 'populated';
  const repository = new MockSleepRepository(key, { scenario });
  repositories.set(key, repository);
  return repository;
}

export function clearSleepRepositories(): void {
  repositories.clear();
}
