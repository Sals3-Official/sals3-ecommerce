import { describe, expect, it } from 'vitest';
import { MIN_PASSWORD_LENGTH } from './login-schema';
import {
  MAX_FULL_NAME_LENGTH,
  SIGNUP_FIELD_ORDER,
  getSignupFieldErrors,
  signupSchema,
} from './signup-schema';

const VALID = {
  fullName: 'AJ Shopper',
  email: 'newcomer@example.com',
  password: 'correct-horse-1',
  confirmPassword: 'correct-horse-1',
};

describe('signupSchema', () => {
  it('accepts a well-formed registration', () => {
    expect(signupSchema.safeParse(VALID).success).toBe(true);
  });

  it('trims the name so a stray space is not stored as a display name', () => {
    const result = signupSchema.safeParse({
      ...VALID,
      fullName: '  AJ Shopper  ',
    });

    expect(result.success && result.data.fullName).toBe('AJ Shopper');
  });

  it('inherits the email and password rules from the sign-in schema', () => {
    expect(getSignupFieldErrors({ ...VALID, email: 'nope' })).toHaveProperty(
      'email',
    );
    expect(
      getSignupFieldErrors({
        ...VALID,
        password: 'short',
        confirmPassword: 'short',
      }),
    ).toHaveProperty('password');
  });
});

describe('full name', () => {
  it('requires a name', () => {
    expect(getSignupFieldErrors({ ...VALID, fullName: '' })).toHaveProperty(
      'fullName',
    );
  });

  it('rejects a name past the display-name maximum', () => {
    expect(
      getSignupFieldErrors({
        ...VALID,
        fullName: 'a'.repeat(MAX_FULL_NAME_LENGTH + 1),
      }),
    ).toHaveProperty('fullName');
  });

  it.each([
    ['accented letters', 'Zoë Ámundsen'],
    ['a Vietnamese name', 'Ngô Đình Diệm'],
    ['Cyrillic', 'Анна Иванова'],
    ['Japanese', '山田 太郎'],
    ['a hyphenated name', 'Anne-Marie Smith'],
    ['an apostrophe', "O'Brien"],
    ['a curly apostrophe', 'O’Brien'],
    ['an initial', 'J. R. Hartley'],
  ])('accepts %s', (_name, fullName) => {
    // An ASCII-only rule would reject a large share of real names.
    expect(getSignupFieldErrors({ ...VALID, fullName })).toEqual({});
  });

  it.each([
    ['markup', '<script>alert(1)</script>'],
    ['an email address', 'me@example.com'],
    ['digits', 'Agent 007'],
    ['a URL', 'https://example.com'],
  ])('rejects %s in the name field', (_name, fullName) => {
    expect(getSignupFieldErrors({ ...VALID, fullName })).toHaveProperty(
      'fullName',
    );
  });
});

describe('confirm password', () => {
  it('rejects a mismatch and blames the confirm field, not the password', () => {
    const errors = getSignupFieldErrors({
      ...VALID,
      confirmPassword: 'correct-horse-2',
    });

    expect(errors.confirmPassword).toMatch(/must match/i);
    expect(errors.password).toBeUndefined();
  });

  it('accepts a matching pair at the minimum length', () => {
    const password = 'a'.repeat(MIN_PASSWORD_LENGTH);

    expect(
      getSignupFieldErrors({ ...VALID, password, confirmPassword: password }),
    ).toEqual({});
  });
});

describe('getSignupFieldErrors', () => {
  it('returns nothing for a valid payload', () => {
    expect(getSignupFieldErrors(VALID)).toEqual({});
  });

  it('never echoes a submitted value back in a message', () => {
    const messages = Object.values(
      getSignupFieldErrors({
        fullName: '<script>',
        email: 'bad@@example',
        password: 'x',
        confirmPassword: 'y',
      }),
    ).join('|');

    expect(messages).not.toContain('<script>');
    expect(messages).not.toContain('bad@@example');
    expect(messages).not.toContain('x');
  });

  it('orders the fields to match the visual top-to-bottom order', () => {
    // The form focuses the first entry with an error, so this order is what
    // makes "first invalid field" mean the topmost one.
    expect(SIGNUP_FIELD_ORDER).toEqual([
      'fullName',
      'email',
      'password',
      'confirmPassword',
    ]);
  });
});
