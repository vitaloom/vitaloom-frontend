import { apiRequest, rawApiRequest } from '@/lib/api/http-client';
import type { AuthTokens, AuthUser, ProfileInvitationDecision, RegisterResult } from '../types/auth';

type Credentials = { email: string; password: string };
const json = (value: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(value) });

export const authApi = {
  register: (credentials: Credentials) => rawApiRequest<RegisterResult>('/auth/register', json(credentials)),
  login: (credentials: Credentials) => rawApiRequest<AuthTokens>('/auth/login', json(credentials)),
  refresh: (refreshToken: string) => rawApiRequest<{ accessToken: string; expiresInSeconds: number }>('/auth/refresh', json({ refreshToken })),
  me: () => apiRequest<AuthUser>('/auth/me', {}, true),
  saveProfileInvitation: (decision: Exclude<ProfileInvitationDecision, 'pending'>) =>
    apiRequest<{ decision: Exclude<ProfileInvitationDecision, 'pending'> }>('/me/profile-invitation', {
      method: 'PUT', body: JSON.stringify({ decision }),
    }, true),
};
