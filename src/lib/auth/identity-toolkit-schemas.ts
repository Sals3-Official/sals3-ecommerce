import { z } from 'zod';

/**
 * Response shapes for the Identity Toolkit v1 endpoints this app calls.
 *
 * Only the fields we actually consume are declared. `refreshToken` is
 * deliberately absent: it is a long-lived credential with no use here, and
 * omitting it from the parsed result means no variable ever holds it and
 * nothing can accidentally log or return it.
 */

export const signInResponseSchema = z.object({
  idToken: z.string().min(1),
  localId: z.string().min(1),
});

export const signUpResponseSchema = z.object({
  idToken: z.string().min(1),
  localId: z.string().min(1),
});

export const sendOobCodeResponseSchema = z.object({
  email: z.string().optional(),
});

/**
 * Google returns `{ error: { code, message } }`, where `message` is either a
 * bare code (`EMAIL_NOT_FOUND`) or a code with a human suffix
 * (`WEAK_PASSWORD : Password should be at least 6 characters`).
 */
const errorEnvelopeSchema = z.object({
  error: z.object({
    message: z.string(),
  }),
});

export const IDENTITY_TOOLKIT_UNKNOWN_ERROR = 'UNKNOWN';

/**
 * Extracts the leading code only. The human suffix is Google's wording, is not
 * localised, and must never reach a Sals3 visitor.
 */
export function parseIdentityToolkitError(body: unknown) {
  const parsed = errorEnvelopeSchema.safeParse(body);

  if (!parsed.success) {
    return IDENTITY_TOOLKIT_UNKNOWN_ERROR;
  }

  return (
    parsed.data.error.message.split(' : ')[0]?.trim() ||
    IDENTITY_TOOLKIT_UNKNOWN_ERROR
  );
}
