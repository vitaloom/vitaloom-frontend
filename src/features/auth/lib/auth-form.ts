export type AuthFormMode = 'sign-in' | 'register';
export type AuthFormErrors = { email?: string; password?: string };
export type AuthFormMessages = {
  validationEmailRequired: string;
  validationEmailInvalid: string;
  validationPasswordRequired: string;
  validationPasswordShort: string;
  errorNetwork: string;
  errorCredentials: string;
  errorAlreadyRegistered: string;
  errorSignIn: string;
  errorRegister: string;
};

export function validateCredentials(email: string, password: string, mode: AuthFormMode, messages?: AuthFormMessages): AuthFormErrors {
  const text = messages ?? {
    validationEmailRequired: 'Enter your email.',
    validationEmailInvalid: 'Enter a valid email address.',
    validationPasswordRequired: 'Enter your password.',
    validationPasswordShort: 'Use at least 8 characters.',
  };
  const errors: AuthFormErrors = {};
  const normalized = email.trim();
  if (!normalized) errors.email = text.validationEmailRequired;
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) errors.email = text.validationEmailInvalid;
  if (!password) errors.password = text.validationPasswordRequired;
  else if (mode === 'register' && password.length < 8) errors.password = text.validationPasswordShort;
  return errors;
}

export function authErrorMessage(mode: AuthFormMode, status: number, code: string, messages?: AuthFormMessages): string {
  const text = messages ?? {
    errorNetwork: 'Unable to connect. Check your connection and try again.',
    errorCredentials: 'Incorrect email or password. Try again.',
    errorAlreadyRegistered: 'An account with this email already exists. Sign in instead.',
    errorSignIn: 'Unable to sign in right now. Try again.',
    errorRegister: 'Unable to create your account right now. Try again.',
  };
  if (code === 'NETWORK_ERROR' || status === 0) return text.errorNetwork;
  if (mode === 'sign-in' && (code === 'INVALID_CREDENTIALS' || status === 401)) return text.errorCredentials;
  if (mode === 'register' && (code === 'EMAIL_ALREADY_REGISTERED' || status === 409)) return text.errorAlreadyRegistered;
  return mode === 'sign-in' ? text.errorSignIn : text.errorRegister;
}
