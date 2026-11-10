import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateCredentials, authErrorMessage } from '../src/features/auth/lib/auth-form.ts';

test('validates required email and password without changing password', () => {
  assert.deepEqual(validateCredentials(' ', '', 'sign-in'), { email: 'Enter your email.', password: 'Enter your password.' });
  assert.deepEqual(validateCredentials(' user+tag@example.com ', ' 12345678 ', 'register'), {});
  assert.deepEqual(validateCredentials('bad', '1234567', 'register'), { email: 'Enter a valid email address.', password: 'Use at least 8 characters.' });
});

test('maps login, duplicate email and network failures to safe distinct copy', () => {
  assert.match(authErrorMessage('sign-in', 401, 'INVALID_CREDENTIALS'), /email or password/i);
  assert.match(authErrorMessage('register', 409, 'EMAIL_ALREADY_REGISTERED'), /already exists/i);
  assert.match(authErrorMessage('sign-in', 0, 'NETWORK_ERROR'), /connection/i);
});
