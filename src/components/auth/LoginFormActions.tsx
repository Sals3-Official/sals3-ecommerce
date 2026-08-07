'use client';

import FormAlert from './FormAlert';
import GoogleSignInButton from './GoogleSignInButton';
import StatusAnnouncer from './StatusAnnouncer';
import SubmitButton from './SubmitButton';
import {
  getLoginAnnouncement,
  isPendingVia,
  type LoginStatus,
} from './login-form-status';

type LoginFormActionsProps = {
  status: LoginStatus;
  isHydrated: boolean;
  onStatusChange: (status: LoginStatus) => void;
  onGoogleSuccess: () => void;
};

/**
 * Everything below the credential fields: the announcements, the message
 * regions, and both sign-in buttons.
 *
 * Split out so `LoginForm` holds the state machine and this holds the layout;
 * neither file then has to be read in full to change the other.
 */
export default function LoginFormActions({
  status,
  isHydrated,
  onStatusChange,
  onGoogleSuccess,
}: LoginFormActionsProps) {
  const isPasswordPending = isPendingVia(status, 'password');
  const isGooglePending = isPendingVia(status, 'google');

  return (
    <div className="flex flex-col gap-5">
      <StatusAnnouncer message={getLoginAnnouncement(status)} />

      <FormAlert message={status.kind === 'error' ? status.message : null} />

      {/*
        A control is never given the real `disabled` attribute for its own
        pending state — that would blur the button the visitor just pressed. It
        may be disabled while the *other* method runs, because focus is then on
        that other control.
      */}
      <SubmitButton
        label="Continue"
        pendingLabel="Signing in..."
        isPending={isPasswordPending}
        isDisabled={!isHydrated || isGooglePending}
      />

      <GoogleSignInButton
        isPending={isGooglePending}
        isDisabled={!isHydrated || isPasswordPending}
        onPendingChange={(pending) => {
          onStatusChange(
            pending ? { kind: 'pending', via: 'google' } : { kind: 'idle' },
          );
        }}
        onError={(message) => onStatusChange({ kind: 'error', message })}
        onSuccess={onGoogleSuccess}
      />
    </div>
  );
}
