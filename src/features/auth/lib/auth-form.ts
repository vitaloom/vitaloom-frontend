export type AuthFormMode = 'sign-in' | 'register';
export type AuthFormErrors = { email?: string; password?: string };

export function validateCredentials(email: string, password: string, mode: AuthFormMode): AuthFormErrors {
  const errors: AuthFormErrors = {};
  const normalized = email.trim();
  if (!normalized) errors.email = 'Enter your email.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Enter your password.';
  else if (mode === 'register' && password.length < 8) errors.password = 'Use at least 8 characters.';
  return errors;
}

export function authErrorMessage(mode: AuthFormMode, status: number, code: string): string {
  if (code === 'NETWORK_ERROR' || status === 0) return 'Unable to connect. Check your connection and try again.';
  if (mode === 'sign-in' && (code === 'INVALID_CREDENTIALS' || status === 401)) return 'Incorrect email or password. Try again.';
  if (mode === 'register' && (code === 'EMAIL_ALREADY_REGISTERED' || status === 409)) return 'An account with this email already exists. Sign in instead.';
  return mode === 'sign-in' ? 'Unable to sign in right now. Try again.' : 'Unable to create your account right now. Try again.';
}
