'use client';

import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import focusFirstInvalidField from '@/lib/auth/focus-first-invalid-field';
import {
  LOGIN_FIELD_ORDER,
  getLoginFieldErrors,
  type LoginFieldErrors,
  type LoginFieldName,
} from '@/lib/auth/login-schema';
import getLoginErrorNotice from '@/lib/auth/login-status';
import signInWithPasswordSession from '@/lib/auth/password-login';
import { syncKlaviyoProfile } from '@/lib/klaviyo/client';
import EmailField from './EmailField';
import LoginFormActions from './LoginFormActions';
import PasswordField from './PasswordField';
import { IDLE_STATUS, type LoginStatus } from './login-form-status';
import {
  getClientHydrationSnapshot,
  getServerHydrationSnapshot,
  subscribeToHydration,
} from './hydration-snapshot';

/**
 * Login credential form.
 *
 * Security posture — deliberate and load-bearing:
 * - The form has no `action` and its submit handler always calls
 *   `preventDefault()`. Without that, the browser's default GET submit would
 *   put the password in the URL query string, the address bar, and every
 *   downstream log.
 * - The password lives only in React state: never in web storage, never
 *   logged, never in a URL. It is cleared the moment it can no longer be used
 *   — on success and on the Google path — and kept after a failure, so a
 *   one-character typo does not force a full retype. Clearing only the
 *   password would also hint that the password was the wrong half, which the
 *   deliberately generic server message exists to avoid.
 * - Client validation is UX only. `POST /api/auth/login` re-validates with the
 *   same `loginSchema`, checks CSRF, and throttles per address and per account
 *   (nextjs-component-security-code-rules rules 17, 27, 29).
 */
export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginFieldErrors>({});
  const [status, setStatus] = useState<LoginStatus>(IDLE_STATUS);
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );

  /** Validates one field on blur without surfacing the other field's error yet. */
  function validateField(field: LoginFieldName) {
    const fieldErrors = getLoginFieldErrors({ email, password });

    setErrors((current) => ({ ...current, [field]: fieldErrors[field] }));
  }

  /** Editing anything makes the last outcome stale, so the slot is cleared. */
  function clearFieldError(field: LoginFieldName) {
    setErrors((current) => ({ ...current, [field]: undefined }));
    setStatus((current) => (current.kind === 'idle' ? current : IDLE_STATUS));
  }

  async function submitCredentials(form: HTMLFormElement) {
    try {
      await signInWithPasswordSession({ email, password });
      await syncKlaviyoProfile();

      setPassword('');
      setStatus({ kind: 'success' });
      router.replace('/');
    } catch (error) {
      setStatus({ kind: 'error', message: getLoginErrorNotice(error) });
      // No field can fix this, so focus stays on the submit control and Enter
      // retries.
      form.querySelector<HTMLElement>('button[type="submit"]')?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (status.kind === 'pending' || status.kind === 'success') {
      return;
    }

    const form = event.currentTarget;
    const fieldErrors = getLoginFieldErrors({ email, password });

    setErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) {
      setStatus(IDLE_STATUS);
      focusFirstInvalidField(form, fieldErrors, LOGIN_FIELD_ORDER);
      return;
    }

    setStatus({ kind: 'pending', via: 'password' });
    submitCredentials(form).catch(() => undefined);
  }

  return (
    <form
      onSubmit={handleSubmit}
      method="post"
      noValidate
      className="flex flex-col gap-[30px]"
    >
      <EmailField
        value={email}
        error={errors.email}
        onValueChange={(value) => {
          setEmail(value);
          clearFieldError('email');
        }}
        onBlurValidate={() => validateField('email')}
      />

      <PasswordField
        value={password}
        error={errors.password}
        onValueChange={(value) => {
          setPassword(value);
          clearFieldError('password');
        }}
        onBlurValidate={() => validateField('password')}
      />

      <LoginFormActions
        status={status}
        isHydrated={isHydrated}
        onStatusChange={setStatus}
        onGoogleSuccess={() => {
          setPassword('');
          setStatus({ kind: 'success' });
          syncKlaviyoProfile().catch(() => undefined);
          router.replace('/');
        }}
      />
    </form>
  );
}
