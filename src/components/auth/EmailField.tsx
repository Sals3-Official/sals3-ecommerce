'use client';

import { useId } from 'react';
import { MAX_EMAIL_LENGTH } from '@/lib/auth/login-schema';
import { AUTH_INPUT_CLASS } from './auth-field-styles';
import AuthField from './AuthField';

type EmailFieldProps = {
  value: string;
  error?: string;
  onValueChange: (value: string) => void;
  onBlurValidate: () => void;
};

export default function EmailField({
  value,
  error,
  onValueChange,
  onBlurValidate,
}: EmailFieldProps) {
  const id = useId();

  return (
    <AuthField id={id} label="Email address" error={error}>
      <input
        id={id}
        name="email"
        type="email"
        placeholder="you@email.com"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onBlur={onBlurValidate}
        className={AUTH_INPUT_CLASS}
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={MAX_EMAIL_LENGTH}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
    </AuthField>
  );
}
