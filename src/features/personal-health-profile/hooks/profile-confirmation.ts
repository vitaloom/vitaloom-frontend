import type { ProfileRepository } from '../api/profile-repository';
import type { ProfileSnapshot } from '../types/profile';

const confirmations = new WeakMap<ProfileRepository, string>();

export function rememberProfileConfirmation(repository: ProfileRepository, snapshot: ProfileSnapshot) {
  confirmations.set(repository, snapshot.revision);
}

export function takeProfileConfirmation(repository: ProfileRepository, snapshot: ProfileSnapshot) {
  const confirmed = confirmations.get(repository) === snapshot.revision;
  confirmations.delete(repository);
  return confirmed;
}
