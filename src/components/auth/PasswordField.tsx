'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import AUTH_LINKS from '@/lib/auth/auth-links';
import { MAX_PASSWORD_LENGTH } from '@/lib/auth/login-schema';
import {
  AUTH_LINK_CLASS,
  AUTH_INPUT_WITH_TRAILING_CLASS,
} from './auth-field-styles';
import AuthField from './AuthField';

type PasswordFieldProps = {
  value: string;
  error?: string;
  onValueChange: (value: string) => void;
  onBlurValidate: () => void;
};

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
}: PasswordFieldProps) {
  const id = useId();
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <AuthField
      id={id}
      label="Password"
      labelAside={
        <Link
          href={AUTH_LINKS.passwordReset}
          className={`${AUTH_LINK_CLASS} text-sm`}
        >
          Forgot password?
        </Link>
      }
      error={error}
    >
      <div className="relative flex items-center">
        <input
          id={id}
          name="password"
          type={isRevealed ? 'text' : 'password'}
          placeholder="Enter your password"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onBlur={onBlurValidate}
          className={AUTH_INPUT_WITH_TRAILING_CLASS}
          autoComplete="current-password"
          maxLength={MAX_PASSWORD_LENGTH}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button
          type="button"
          onClick={() => setIsRevealed((revealed) => !revealed)}
          className="absolute right-2 h-[42px] cursor-pointer rounded-xl border-0 bg-transparent px-3 text-sm font-semibold text-auth-azure hover:bg-auth-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-azure"
        >
          {/*
            The design's visible label is one word. "Show" alone is ambiguous
            out of context, so the full phrase is supplied to assistive tech
            while the visible word stays as designed. The visible word is a
            prefix of the accessible name, so voice-control targeting ("click
            Show") still matches.
          */}
          <span aria-hidden="true">{isRevealed ? 'Hide' : 'Show'}</span>
          <span className="sr-only">
            {isRevealed ? 'Hide password' : 'Show password'}
          </span>
        </button>
      </div>
    </AuthField>
  );
}
