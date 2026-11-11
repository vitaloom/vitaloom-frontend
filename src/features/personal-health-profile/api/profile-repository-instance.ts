import { MockProfileRepository, type ProfileMockScenario } from '../mocks/mock-profile-repository';
import type { ProfileRepository } from './profile-repository';

const repositories = new Map<string, ProfileRepository>();
const scenarios: readonly ProfileMockScenario[] = [
  'empty', 'populated', 'load-error', 'unauthorized', 'conflict', 'conflict-refresh-failure',
  'validation-failure', 'partial-update', 'unconfirmed-after-write', 'unconfirmed-before-write',
];

/** Composition point for replacing the in-memory adapter with an authenticated API adapter. */
export function getProfileRepository(accountId: string): ProfileRepository {
  let repository = repositories.get(accountId);
  if (!repository) {
    const requestedScenario = process.env.EXPO_PUBLIC_PROFILE_MOCK_SCENARIO;
    const scenario = __DEV__ && scenarios.includes(requestedScenario as ProfileMockScenario)
      ? requestedScenario as ProfileMockScenario
      : 'empty';
    repository = new MockProfileRepository(scenario);
    repositories.set(accountId, repository);
  }
  return repository;
}
