import type {
  CreateProfileRequest,
  ProfileLoadResult,
  ProfileOperationResult,
  UpdateProfileRequest,
} from '../types/profile';

export type { ProfileLoadResult, ProfileOperationResult } from '../types/profile';

export interface ProfileRepository {
  getMyProfile(attemptId?: string): Promise<ProfileLoadResult>;
  createMyProfile(request: CreateProfileRequest): Promise<ProfileOperationResult>;
  updateMyProfile(request: UpdateProfileRequest): Promise<ProfileOperationResult>;
}

