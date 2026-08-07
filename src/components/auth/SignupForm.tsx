'use client';

import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import focusFirstInvalidField from '@/lib/auth/focus-first-invalid-field';
import getLoginErrorNotice, {
  SIGNED_IN_ANNOUNCEMENT,
} from '@/lib/auth/login-status';
import signUpWithPasswordAccount from '@/lib/auth/password-signup';
import {
  SIGNUP_FIELD_ORDER,
  getSignupFieldErrors,
  type SignupFieldErrors,
  type SignupFieldName,
} from '@/lib/auth/signup-schema';
import FormAlert from './FormAlert';
import SignupFields, { type SignupFieldValues } from './SignupFields';
import StatusAnnouncer from './StatusAnnouncer';
import SubmitButton from './SubmitButton';
import {
  getClientHydrationSnapshot,
  getServerHydrationSnapshot,
  subscribeToHydration,
} from './hydration-snapshot';

const EMPTY_FIELDS: SignupFieldValues = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

type SignupStatus =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'error'; message: string }
  | { kind: 'success' };

function getSignupAnnouncement(status: SignupStatus) {
  if (status.kind === 'success') {
    return SIGNED_IN_ANNOUNCEMENT;
  }

  return status.kind === 'pending' ? 'Creating your account.' : '';
}

/**
 * Account registration form.
 *
 * Shares the login form's posture: no `action`, always `preventDefault()`, the
 * password only ever in React state, and client validation treated as UX while
 * `POST /api/auth/signup` re-validates, checks CSRF, and throttles.
 *
 * A successful registration signs the visitor in and sends them home. There is
 * no interstitial: the account is usable immediately, so a confirmation screen
 * would be a step with nothing to confirm.
 */
export default function SignupForm() {
  const router = useRouter();
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [errors, setErrors] = useState<SignupFieldErrors>({});
  const [status, setStatus] = useState<SignupStatus>({ kind: 'idle' });
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );

  function setField(field: SignupFieldName, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setStatus((current) =>
      current.kind === 'idle' ? current : { kind: 'idle' },
    );
  }

  /** Validates one field on blur without surfacing the others' errors yet. */
  function validateField(field: SignupFieldName) {
    const fieldErrors = getSignupFieldErrors(fields);

    setErrors((current) => ({ ...current, [field]: fieldErrors[field] }));
  }

  async function submitRegistration() {
    try {
      await signUpWithPasswordAccount({
        fullName: fields.fullName,
        email: fields.email,
        password: fields.password,
      });

      // Both passwords go the moment they can no longer be used.
      setFields((current) => ({
        ...current,
        password: '',
        confirmPassword: '',
      }));
      setStatus({ kind: 'success' });
      // `replace`, not `push`: Back must not return a signed-in visitor to a
      // registration form.
      router.replace('/');
    } catch (error) {
      setStatus({ kind: 'error', message: getLoginErrorNotice(error) });
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (status.kind === 'pending' || status.kind === 'success') {
      return;
    }

    const form = event.currentTarget;
    const fieldErrors = getSignupFieldErrors(fields);

    setErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) {
      setStatus({ kind: 'idle' });
      focusFirstInvalidField(form, fieldErrors, SIGNUP_FIELD_ORDER);
      return;
    }

    setStatus({ kind: 'pending' });
    submitRegistration().catch(() => undefined);
  }

  return (
    <form
      onSubmit={handleSubmit}
      method="post"
      noValidate
      className="flex flex-col gap-[30px]"
    >
      <SignupFields
        values={fields}
        errors={errors}
        onFieldChange={(field, value) => setField(field, value)}
        onFieldBlur={(field) => validateField(field)}
      />

      <div className="flex flex-col gap-5">
        {/*
          A client-side route change makes no sound, so the redirect has to be
          announced or a screen-reader user is moved with no explanation.
        */}
        <StatusAnnouncer message={getSignupAnnouncement(status)} />

        <FormAlert message={status.kind === 'error' ? status.message : null} />

        <SubmitButton
          label="Create account"
          pendingLabel="Creating account..."
          isPending={status.kind === 'pending' || status.kind === 'success'}
          isDisabled={!isHydrated}
        />
      </div>
    </form>
  );
}
