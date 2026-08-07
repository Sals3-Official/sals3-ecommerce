'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import AUTH_LINKS from '@/lib/auth/auth-links';
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from '@/lib/auth/login-schema';
import { CheckBadgeIcon } from '@/components/icons/Icon';
import {
  AUTH_HELPER_CLASS,
  AUTH_HELPER_MET_CLASS,
  AUTH_LINK_CLASS,
  AUTH_INPUT_WITH_TRAILING_CLASS,
} from './auth-field-styles';
import AuthField from './AuthField';
import { PASSWORD_PURPOSES, type PasswordPurpose } from './password-purposes';

type PasswordFieldProps = {
  value: string;
  error?: string;
  onValueChange: (value: string) => void;
  onBlurValidate: () => void;
  /** Defaults to the sign-in variant so existing call sites are unaffected. */
  purpose?: PasswordPurpose;
};

function RevealButton({
  isRevealed,
  onToggle,
}: {
  isRevealed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-2 h-[44px] cursor-pointer rounded-xl border-0 bg-transparent px-3 text-sm font-semibold text-auth-azure hover:bg-auth-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-azure"
    >
      {/*
        The design's visible label is one word. "Show" alone is ambiguous out of
        context, so the full phrase is supplied to assistive tech while the
        visible word stays as designed. The visible word is a prefix of the
        accessible name, so voice-control targeting ("click Show") still
        matches.
      */}
      <span aria-hidden="true">{isRevealed ? 'Hide' : 'Show'}</span>
      <span className="sr-only">
        {isRevealed ? 'Hide password' : 'Show password'}
      </span>
    </button>
  );
}

/**
 * Password input with a reveal toggle. Reveal state is local because nothing
 * outside this control needs it, and it is intentionally never persisted — the
 * field re-masks on every mount.
 */
export default function PasswordField({
  value,
  error,
  onValueChange,
  onBlurValidate,
  purpose = 'signIn',
}: PasswordFieldProps) {
  const id = useId();
  const [isRevealed, setIsRevealed] = useState(false);
  const variant = PASSWORD_PURPOSES[purpose];
  const helperId = variant.hasLengthHelper ? `${id}-helper` : undefined;

  // The helper text itself never changes, only its icon and colour: a
  // description that mutates on every keystroke is re-announced by some screen
  // readers. The tick is affirmation, not validation — the error still only
  // appears on blur.
  const isLengthMet = value.length >= MIN_PASSWORD_LENGTH;

  return (
    <AuthField
      id={id}
      label={variant.label}
      labelAside={
        variant.hasResetLink ? (
          <Link
            href={AUTH_LINKS.passwordReset}
            className={`${AUTH_LINK_CLASS} -my-2 py-2 text-sm`}
          >
            Forgot password?
          </Link>
        ) : undefined
      }
      error={error}
    >
      <div className="relative flex items-center">
        <input
          id={id}
          name={variant.name}
          type={isRevealed ? 'text' : 'password'}
          placeholder={variant.placeholder}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onBlur={onBlurValidate}
          className={AUTH_INPUT_WITH_TRAILING_CLASS}
          autoComplete={variant.autoComplete}
          maxLength={MAX_PASSWORD_LENGTH}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [helperId, error ? `${id}-error` : undefined]
              .filter(Boolean)
              .join(' ') || undefined
          }
        />
        <RevealButton
          isRevealed={isRevealed}
          onToggle={() => setIsRevealed((revealed) => !revealed)}
        />
      </div>

      {helperId ? (
        <p
          id={helperId}
          className={`${AUTH_HELPER_CLASS} ${isLengthMet ? AUTH_HELPER_MET_CLASS : ''}`}
        >
          {isLengthMet ? <CheckBadgeIcon width={14} height={14} /> : null}
          Must be at least {MIN_PASSWORD_LENGTH} characters.
        </p>
      ) : null}
    </AuthField>
  );
}
