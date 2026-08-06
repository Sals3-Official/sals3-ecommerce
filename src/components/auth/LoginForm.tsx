'use client';

import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  getLoginFieldErrors,
  type LoginFieldErrors,
  type LoginFieldName,
} from '@/lib/auth/login-schema';
import signInWithGoogleSession from '@/lib/auth/firebase-google-login';
import EmailField from './EmailField';
import GoogleMark from './GoogleMark';
import PasswordField from './PasswordField';
import {
  AUTH_PRIMARY_BUTTON_CLASS,
  AUTH_SECONDARY_BUTTON_CLASS,
} from './auth-field-styles';

const UNAVAILABLE_NOTICE =
  'Sals3 accounts are not switched on yet, so there is nothing to sign in to. Nothing you typed was sent anywhere — you can keep browsing in the meantime.';
const GOOGLE_ERROR_NOTICE =
  'Google sign-in could not be completed. Check that Firebase is configured and that this domain is authorized, then try again.';
const GOOGLE_CLIENT_CONFIG_NOTICE =
  'Firebase web config is missing for this site. Add the NEXT_PUBLIC_FIREBASE values, then restart or redeploy.';
const GOOGLE_SERVER_SESSION_NOTICE =
  'Google connected, but Sals3 could not create the secure server session. Add Firebase Admin credentials on the server, then restart or redeploy.';
const GOOGLE_CSRF_NOTICE =
  'Secure Google sign-in could not start. Refresh the page and try again.';
const GOOGLE_CONFIG_NOT_FOUND_NOTICE =
  'Firebase Authentication is not enabled for this project yet. Enable Authentication > Sign-in method > Google in Firebase Console, then restart the dev server.';
const GOOGLE_UNAUTHORIZED_DOMAIN_NOTICE =
  'This domain is not authorized for Google sign-in. Add localhost or the production host in Firebase Authentication authorized domains, without protocol or port.';
const GOOGLE_PROVIDER_DISABLED_NOTICE =
  'Google sign-in is not enabled in Firebase Authentication yet. Enable the Google provider in Firebase Console, then try again.';

function getGoogleErrorNotice(error: unknown) {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : '';
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : '';

  if (
    code === 'auth/missing-client-config' ||
    message.includes('Firebase web configuration is missing')
  ) {
    return GOOGLE_CLIENT_CONFIG_NOTICE;
  }

  if (code === 'auth/server-session-unavailable') {
    return GOOGLE_SERVER_SESSION_NOTICE;
  }

  if (code === 'auth/csrf-unavailable') {
    return GOOGLE_CSRF_NOTICE;
  }

  if (
    code === 'auth/configuration-not-found' ||
    message.includes('CONFIGURATION_NOT_FOUND')
  ) {
    return GOOGLE_CONFIG_NOT_FOUND_NOTICE;
  }

  if (code === 'auth/unauthorized-domain') {
    return GOOGLE_UNAUTHORIZED_DOMAIN_NOTICE;
  }

  if (code === 'auth/operation-not-allowed') {
    return GOOGLE_PROVIDER_DISABLED_NOTICE;
  }

  return GOOGLE_ERROR_NOTICE;
}

function subscribeToHydration(onStoreChange: () => void) {
  queueMicrotask(onStoreChange);

  return () => undefined;
}

function getClientHydrationSnapshot() {
  return true;
}

function getServerHydrationSnapshot() {
  return false;
}

/**
 * Login credential form.
 *
 * Security posture — deliberate and load-bearing:
 * - No auth endpoint exists yet, so this form has no `action` and its submit
 *   handler always calls `preventDefault()`. Without that, the browser's default
 *   GET submit would put the password in the URL query string, the address bar,
 *   and every downstream log.
 * - The password lives only in React state. It is never written to
 *   `localStorage`/`sessionStorage`, never logged, and is cleared after a
 *   submit attempt.
 * - Client validation is UX only. When a real endpoint lands it must re-validate
 *   with the same `loginSchema` on the server and add rate limiting and CSRF
 *   protection (see nextjs-component-security-code-rules rules 17, 27, 29).
 */
export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginFieldErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [isGooglePending, setIsGooglePending] = useState(false);
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const fieldErrors = getLoginFieldErrors({ email, password });

    setErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) {
      setNotice(null);
      return;
    }

    setPassword('');
    setNotice(UNAVAILABLE_NOTICE);
  }

  async function handleGoogleSignIn() {
    setNotice(null);
    setIsGooglePending(true);

    try {
      await signInWithGoogleSession();
      setPassword('');
      router.push('/');
    } catch (error) {
      setNotice(getGoogleErrorNotice(error));
    } finally {
      setIsGooglePending(false);
    }
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
          setErrors((current) => ({ ...current, email: undefined }));
        }}
        onBlurValidate={() => validateField('email')}
      />

      <PasswordField
        value={password}
        error={errors.password}
        onValueChange={(value) => {
          setPassword(value);
          setErrors((current) => ({ ...current, password: undefined }));
        }}
        onBlurValidate={() => validateField('password')}
      />

      <div className="flex flex-col gap-5">
        {notice ? (
          <p
            role="status"
            className="rounded-2xl bg-auth-tint-soft px-4 py-3 text-[13px] leading-relaxed text-auth-body"
          >
            {notice}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!isHydrated || isGooglePending}
          className={AUTH_PRIMARY_BUTTON_CLASS}
        >
          Continue
        </button>

        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-auth-divider" />
          <span className="text-[13px] font-medium tracking-[0.08em] text-auth-muted">
            OR
          </span>
          <div className="h-px flex-1 bg-auth-divider" />
        </div>

        <button
          type="button"
          onClick={() => {
            handleGoogleSignIn().catch(() => undefined);
          }}
          disabled={!isHydrated || isGooglePending}
          className={AUTH_SECONDARY_BUTTON_CLASS}
        >
          <GoogleMark />
          {isGooglePending ? 'Connecting to Google...' : 'Continue with Google'}
        </button>
      </div>
    </form>
  );
}
