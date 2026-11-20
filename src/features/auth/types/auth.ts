export type ProfileInvitationDecision = 'pending' | 'skipped' | 'completed';
export type AuthUser = { id: string; email: string; profileInvitation?: ProfileInvitationDecision };
export type AuthTokens = { user: AuthUser; accessToken: string; refreshToken: string; expiresInSeconds: number };
export type RegisterResult = AuthTokens | { user: AuthUser; authStatus: 'LOGIN_REQUIRED' };
export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated' | 'temporarilyUnavailable';
