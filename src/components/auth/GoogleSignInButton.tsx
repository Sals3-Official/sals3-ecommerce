'use client';

import signInWithGoogleSession from '@/lib/auth/firebase-google-login';
import getGoogleErrorNotice from '@/lib/auth/google-error-notice';
import GoogleMark from './GoogleMark';
import { AUTH_SECONDARY_BUTTON_CLASS } from './auth-field-styles';

type GoogleSignInButtonProps = {
  isPending: boolean;
  /**
   * True before hydration, or while the *other* sign-in method is running.
   * Never this button's own pending state — see the attribute choice below.
   */
  isDisabled: boolean;
  onPendingChange: (isPending: boolean) => void;
  onError: (notice: string) => void;
  onSuccess: () => void;
};

/**
 * The Google option, including the divider that introduces it.
 *
 * Owns the whole popup flow so the credential form beside it holds no Google
 * state; the two outcomes it reports upward are a notice to display and a
 * successful sign-in to navigate on.
 */
export default function GoogleSignInButton({
  isPending,
  isDisabled,
  onPendingChange,
  onError,
  onSuccess,
}: GoogleSignInButtonProps) {
  async function handleClick() {
    onPendingChange(true);

    // Pending is cleared before the outcome is reported, never in a `finally`:
    // a trailing `onPendingChange(false)` would run after `onError` and reset
    // the very state that just recorded the failure.
    try {
      await signInWithGoogleSession();
      onPendingChange(false);
      onSuccess();
    } catch (error) {
      onPendingChange(false);
      onError(getGoogleErrorNotice(error));
    }
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-auth-divider" />
        <span className="text-[13px] font-medium tracking-[0.08em] text-auth-muted">
          OR
        </span>
        <div className="h-px flex-1 bg-auth-divider" />
      </div>

      {/*
        `aria-disabled` while the popup is open, not `disabled`: setting the
        real attribute on the focused button blurs it, dropping a keyboard
        visitor to the document body mid-flow. The click guard is what
        actually prevents a second popup.
      */}
      <button
        type="button"
        onClick={() => {
          if (isPending) {
            return;
          }

          handleClick().catch(() => undefined);
        }}
        disabled={isDisabled}
        aria-disabled={isPending || undefined}
        className={`${AUTH_SECONDARY_BUTTON_CLASS} aria-disabled:cursor-wait aria-disabled:opacity-70`}
      >
        <GoogleMark />
        {isPending ? 'Connecting to Google...' : 'Continue with Google'}
      </button>
    </>
  );
}
