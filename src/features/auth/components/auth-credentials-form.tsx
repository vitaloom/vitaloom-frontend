import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ApiError } from '@/lib/api/http-client';
import { spacing } from '@/theme';
import { useTranslations } from '@/i18n';
import { authMessages } from '../messages';
import { useAuth } from '../store/auth-context';
import { authErrorMessage, type AuthFormErrors, type AuthFormMode, validateCredentials } from '../lib/auth-form';
import { AuthFormField } from './auth-form-field';
import { AuthPrimaryButton } from './auth-primary-button';
import { useRetryCountdown } from '../lib/use-retry-countdown';

const retryAtByMode: Partial<Record<AuthFormMode, number>> = {};

export function AuthCredentialsForm({ mode, onChangeMode }: { mode: AuthFormMode; onChangeMode: (mode: AuthFormMode) => void }) {
  const t = useTranslations(authMessages);
  const { signIn, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [apiError, setApiError] = useState('');
  const [rateLimited, setRateLimited] = useState(false);
  const [retryAt, setRetryAt] = useState(() => retryAtByMode[mode]);
  const secondsLeft = useRetryCountdown(retryAt);
  const [createdNeedsLogin, setCreatedNeedsLogin] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  async function submit() {
    if (busyRef.current || (retryAtByMode[mode] ?? 0) > Date.now()) return;
    const nextErrors = validateCredentials(email, password, mode, {
      validationEmailRequired: t('validationEmailRequired'),
      validationEmailInvalid: t('validationEmailInvalid'),
      validationPasswordRequired: t('validationPasswordRequired'),
      validationPasswordShort: t('validationPasswordShort'),
      errorNetwork: t('errorNetwork'),
      errorCredentials: t('errorCredentials'),
      errorAlreadyRegistered: t('errorAlreadyRegistered'),
      errorSignIn: t('errorSignIn'),
      errorRegister: t('errorRegister'),
    });
    setErrors(nextErrors);
    if (nextErrors.email) { emailRef.current?.focus(); return; }
    if (nextErrors.password) { passwordRef.current?.focus(); return; }
    busyRef.current = true;
    setBusy(true);
    setApiError('');
    setRateLimited(false);
    try {
      if (mode === 'sign-in') {
        await signIn(email, password);
        router.replace('/');
      } else {
        const result = await register(email, password);
        if ('authStatus' in result) {
          setCreatedNeedsLogin(true);
          setApiError(t('accountCreated'));
        } else router.replace('/');
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 429) {
        retryAtByMode[mode] = cause.retryAt;
        setRetryAt(cause.retryAt);
        setRateLimited((cause.retryAt ?? 0) <= Date.now());
        return;
      }
      const messages = {
        validationEmailRequired: t('validationEmailRequired'), validationEmailInvalid: t('validationEmailInvalid'),
        validationPasswordRequired: t('validationPasswordRequired'), validationPasswordShort: t('validationPasswordShort'),
        errorNetwork: t('errorNetwork'), errorCredentials: t('errorCredentials'), errorAlreadyRegistered: t('errorAlreadyRegistered'),
        errorSignIn: t('errorSignIn'), errorRegister: t('errorRegister'),
      };
      setApiError(cause instanceof ApiError ? authErrorMessage(mode, cause.status, cause.code, messages) : authErrorMessage(mode, -1, 'UNKNOWN', messages));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const nextMode = mode === 'sign-in' ? 'register' : 'sign-in';
  const coolingDown = secondsLeft > 0;
  const countdownKey = mode === 'sign-in' ? 'signInRetryCountdown' : 'registerRetryCountdown';
  const rateLimitedKey = mode === 'sign-in' ? 'signInRateLimited' : 'registerRateLimited';
  const message = coolingDown ? t(countdownKey, { seconds: secondsLeft }) : rateLimited ? t(rateLimitedKey) : apiError;
  return <View style={{ gap: spacing.md }}>
    <AuthFormField kind="email" label={t('email')} value={email} onChangeText={(value) => { setEmail(value); setErrors((current) => ({ ...current, email: undefined })); }} error={errors.email} inputRef={emailRef} onSubmitEditing={() => passwordRef.current?.focus()} returnKeyType="next" />
    <AuthFormField kind="password" label={t('password')} value={password} onChangeText={(value) => { setPassword(value); setErrors((current) => ({ ...current, password: undefined })); }} error={errors.password} inputRef={passwordRef} onSubmitEditing={() => void submit()} returnKeyType="done" newPassword={mode === 'register'} />
    {mode === 'register' && !errors.password ? <ThemedText variant="subhead" themeColor="textSecondary">{t('passwordHint')}</ThemedText> : null}
    {message ? <ThemedText themeColor="danger" accessibilityRole="alert">{message}</ThemedText> : null}
    <AuthPrimaryButton label={createdNeedsLogin ? t('goToSignIn') : mode === 'sign-in' ? t('signIn') : t('createAccount')} busy={busy} disabled={coolingDown} onPress={createdNeedsLogin ? () => onChangeMode('sign-in') : () => void submit()} />
    <Pressable accessibilityRole="button" accessibilityLabel={mode === 'sign-in' ? t('createAccountLower') : t('existingAccount')} onPress={() => onChangeMode(nextMode)} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><ThemedText themeColor="accent" variant="bodyStrong">{mode === 'sign-in' ? t('createAccountLower') : t('existingAccount')}</ThemedText></Pressable>
  </View>;
}
