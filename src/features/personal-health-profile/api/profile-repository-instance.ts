import { HttpProfileRepository } from './http-profile-repository';
import type { ProfileRepository } from './profile-repository';

const repositories = new Map<string, ProfileRepository>();

export function getProfileRepository(accountId: string): ProfileRepository {
  let repository = repositories.get(accountId);
  if (!repository) {
    repository = new HttpProfileRepository();
    repositories.set(accountId, repository);
  }
  return repository;
}
