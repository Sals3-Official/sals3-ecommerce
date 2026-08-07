import { z } from 'zod';
import { MAX_PASSWORD_LENGTH, loginSchema } from './login-schema';

/**
 * Registration shape, built on `loginSchema` so the email and password rules
 * cannot drift between signing up and signing in.
 */

export const MAX_FULL_NAME_LENGTH = 60;

export const FULL_NAME_REQUIRED_MESSAGE = 'Enter your name.';
export const FULL_NAME_INVALID_MESSAGE =
  'Use letters, spaces, hyphens, or apostrophes.';
export const PASSWORD_MATCH_MESSAGE = 'Both passwords must match.';

/**
 * Unicode letter and mark properties rather than `[A-Za-z]`: an ASCII-only
 * rule rejects a large share of the world's real names. Digits and symbols
 * are excluded because this value becomes the account display name.
 */
const FULL_NAME_PATTERN = /^[\p{L}\p{M}'’\-. ]+$/u;

export const fullNameSchema = z
  .string()
  .trim()
  .min(1, FULL_NAME_REQUIRED_MESSAGE)
  .max(MAX_FULL_NAME_LENGTH, FULL_NAME_INVALID_MESSAGE)
  .regex(FULL_NAME_PATTERN, FULL_NAME_INVALID_MESSAGE);

export const signupSchema = loginSchema
  .extend({
    fullName: fullNameSchema,
    confirmPassword: z.string().max(MAX_PASSWORD_LENGTH),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: PASSWORD_MATCH_MESSAGE,
    path: ['confirmPassword'],
  });

export type SignupInput = z.infer<typeof signupSchema>;

export type SignupFieldName = keyof SignupInput;

export type SignupFieldErrors = Partial<Record<SignupFieldName, string>>;

/** Must match the visual top-to-bottom order: the form focuses the first entry that has an error. */
export const SIGNUP_FIELD_ORDER: readonly SignupFieldName[] = [
  'fullName',
  'email',
  'password',
  'confirmPassword',
];

/**
 * Validates a raw, untrusted registration payload and returns the first
 * message per field. Messages describe the input only — never whether the
 * address is already registered, which the signup route also refuses to
 * reveal.
 */
export function getSignupFieldErrors(input: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}): SignupFieldErrors {
  const result = signupSchema.safeParse(input);

  if (result.success) {
    return {};
  }

  const { fieldErrors } = z.flattenError(result.error);

  return SIGNUP_FIELD_ORDER.reduce<SignupFieldErrors>((errors, field) => {
    const message = fieldErrors[field]?.[0];

    return message ? { ...errors, [field]: message } : errors;
  }, {});
}
