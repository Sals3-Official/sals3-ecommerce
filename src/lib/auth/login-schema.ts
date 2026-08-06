import { z } from 'zod';

/**
 * Single source of truth for login credential shape. Kept framework-agnostic so
 * the same schema can be reused verbatim by a server action or route handler
 * when a real Sals3 auth endpoint exists — the client check must never be the
 * only check (see nextjs-component-security-code-rules rule 17).
 */

/** RFC 5321 practical maximum for an addr-spec. */
export const MAX_EMAIL_LENGTH = 254;

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Upper bound so an over-long value is rejected before it ever reaches a
 * hashing function (long-input CPU exhaustion).
 */
export const MAX_PASSWORD_LENGTH = 128;

export const EMAIL_REQUIRED_MESSAGE = 'Enter your email address.';
export const EMAIL_INVALID_MESSAGE = 'Enter a valid email address.';
export const PASSWORD_REQUIRED_MESSAGE = 'Enter your password.';
export const PASSWORD_LENGTH_MESSAGE = `Your password is at least ${MIN_PASSWORD_LENGTH} characters.`;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, EMAIL_REQUIRED_MESSAGE)
    .max(MAX_EMAIL_LENGTH, EMAIL_INVALID_MESSAGE)
    .pipe(z.email(EMAIL_INVALID_MESSAGE)),
  password: z
    .string()
    .min(1, PASSWORD_REQUIRED_MESSAGE)
    .min(MIN_PASSWORD_LENGTH, PASSWORD_LENGTH_MESSAGE)
    .max(MAX_PASSWORD_LENGTH, PASSWORD_LENGTH_MESSAGE),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type LoginFieldName = keyof LoginInput;

export type LoginFieldErrors = Partial<Record<LoginFieldName, string>>;

/**
 * Order matters: the form focuses the first field in this list that has an
 * error, so it must match the visual top-to-bottom order.
 */
export const LOGIN_FIELD_ORDER: readonly LoginFieldName[] = [
  'email',
  'password',
];

/**
 * Validates a raw, untrusted credential pair and returns the first message per
 * field. Messages describe the input only — they never reveal whether an
 * account exists, which would turn the form into a user-enumeration oracle.
 */
export function getLoginFieldErrors(input: {
  email: string;
  password: string;
}): LoginFieldErrors {
  const result = loginSchema.safeParse(input);

  if (result.success) {
    return {};
  }

  const { fieldErrors } = z.flattenError(result.error);

  return LOGIN_FIELD_ORDER.reduce<LoginFieldErrors>((errors, field) => {
    const message = fieldErrors[field]?.[0];

    return message ? { ...errors, [field]: message } : errors;
  }, {});
}
