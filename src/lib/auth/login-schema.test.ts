import { describe, expect, it } from 'vitest';

import {
  EMAIL_INVALID_MESSAGE,
  EMAIL_REQUIRED_MESSAGE,
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  PASSWORD_LENGTH_MESSAGE,
  PASSWORD_REQUIRED_MESSAGE,
  getLoginFieldErrors,
  loginSchema,
} from './login-schema';

const VALID = { email: 'shopper@example.com', password: 'correct-horse-1' };

describe('loginSchema', () => {
  it('accepts a well-formed credential pair and trims the email', () => {
    const result = loginSchema.safeParse({
      ...VALID,
      email: '  shopper@example.com  ',
    });

    expect(result.success).toBe(true);
    expect(result.data?.email).toBe('shopper@example.com');
  });

  it('does not trim the password, so leading and trailing characters count', () => {
    const password = ` ${'a'.repeat(MIN_PASSWORD_LENGTH - 1)}`;
    const result = loginSchema.safeParse({ ...VALID, password });

    expect(result.success).toBe(true);
    expect(result.data?.password).toBe(password);
  });

  it('rejects an over-long password instead of passing it to a hasher', () => {
    const result = loginSchema.safeParse({
      ...VALID,
      password: 'a'.repeat(MAX_PASSWORD_LENGTH + 1),
    });

    expect(result.success).toBe(false);
  });

  it('rejects an over-long email address', () => {
    const local = 'a'.repeat(MAX_EMAIL_LENGTH);
    const result = loginSchema.safeParse({
      ...VALID,
      email: `${local}@example.com`,
    });

    expect(result.success).toBe(false);
  });
});

describe('getLoginFieldErrors', () => {
  it('returns no errors for a valid pair', () => {
    expect(getLoginFieldErrors(VALID)).toEqual({});
  });

  it('reports an empty email as required and an empty password as required', () => {
    expect(getLoginFieldErrors({ email: '   ', password: '' })).toEqual({
      email: EMAIL_REQUIRED_MESSAGE,
      password: PASSWORD_REQUIRED_MESSAGE,
    });
  });

  it.each([
    'not-an-email',
    'missing-domain@',
    '@missing-local.com',
    'spaces in@example.com',
    'trailing@example',
  ])('reports %s as an invalid email address', (email) => {
    expect(getLoginFieldErrors({ ...VALID, email })).toEqual({
      email: EMAIL_INVALID_MESSAGE,
    });
  });

  it('reports a too-short password without revealing anything about accounts', () => {
    const errors = getLoginFieldErrors({
      ...VALID,
      password: 'a'.repeat(MIN_PASSWORD_LENGTH - 1),
    });

    expect(errors).toEqual({ password: PASSWORD_LENGTH_MESSAGE });
    expect(PASSWORD_LENGTH_MESSAGE).not.toMatch(
      /account|exist|found|registered/i,
    );
  });

  it('never echoes the submitted values back in a message', () => {
    const errors = getLoginFieldErrors({
      email: '<script>alert(1)</script>',
      password: 'short',
    });

    expect(JSON.stringify(errors)).not.toContain('script');
  });
});
