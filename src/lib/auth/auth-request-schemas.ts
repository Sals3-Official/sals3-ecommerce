import { z } from 'zod';
import { loginSchema } from './login-schema';
import { fullNameSchema } from './signup-schema';

/**
 * Wire shapes for the auth route handlers.
 *
 * Each one is the existing client-side schema plus the CSRF token, so the
 * server re-validates the credential with the very same rules the form used
 * (rule 17) rather than a second, drifting copy.
 */

/**
 * Bounded so a padded value is rejected by the parser rather than compared.
 * The minimum matches the 43-character base64url token minted by
 * `GET /api/auth/csrf`; a shorter value can never match the cookie, and
 * rejecting it here keeps it away from the constant-time comparison, which
 * throws on a length mismatch.
 */
const csrfTokenSchema = z.string().min(32).max(256);

export const loginRequestSchema = loginSchema.extend({
  csrfToken: csrfTokenSchema,
});

/** No `confirmPassword`: matching two boxes is a typo guard, not a server rule. */
export const signupRequestSchema = loginSchema.extend({
  fullName: fullNameSchema,
  csrfToken: csrfTokenSchema,
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type SignupRequest = z.infer<typeof signupRequestSchema>;
