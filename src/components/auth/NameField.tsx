'use client';

import { useId } from 'react';
import { MAX_FULL_NAME_LENGTH } from '@/lib/auth/signup-schema';
import { AUTH_INPUT_CLASS } from './auth-field-styles';
import AuthField from './AuthField';

type NameFieldProps = {
  value: string;
  error?: string;
  onValueChange: (value: string) => void;
  onBlurValidate: () => void;
};

/**
 * One field rather than first and last.
 *
 * `autocomplete="name"` is a single token, so a password manager fills it in
 * one step, and a single field avoids the first/last assumption that breaks
 * for a large share of the world's names.
 */
export default function NameField({
  value,
  error,
  onValueChange,
  onBlurValidate,
}: NameFieldProps) {
  const id = useId();

  return (
    <AuthField id={id} label="Full name" error={error}>
      <input
        id={id}
        name="fullName"
        type="text"
        placeholder="AJ Shopper"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onBlur={onBlurValidate}
        className={AUTH_INPUT_CLASS}
        autoComplete="name"
        autoCapitalize="words"
        spellCheck={false}
        maxLength={MAX_FULL_NAME_LENGTH}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
    </AuthField>
  );
}
