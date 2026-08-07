import { z } from 'zod';
import authFlowError from './auth-flow-error';

/**
 * Mirrors the token minted by `GET /api/auth/csrf`, which is 32 random bytes
 * rendered base64url. The floor rejects a truncated or placeholder value
 * before it is submitted and compared server-side.
 */
const csrfResponseSchema = z.object({
  csrfToken: z.string().min(32),
});

export const CSRF_UNAVAILABLE_CODE = 'auth/csrf-unavailable';

/**
 * Fetches a fresh CSRF token for a cookie-setting mutation.
 *
 * Always called at the moment of the action, never on mount: the token has a
 * ten-minute lifetime, and a page left open would otherwise submit an expired
 * one. Callers supply their own failure wording so each flow can report the
 * step the visitor was actually taking.
 */
export default async function getCsrfToken(failureMessage: string) {
  const response = await fetch('/api/auth/csrf', { cache: 'no-store' });

  if (!response.ok) {
    throw authFlowError(failureMessage, CSRF_UNAVAILABLE_CODE);
  }

  const parsed = csrfResponseSchema.safeParse(await response.json());

  if (!parsed.success) {
    throw authFlowError(failureMessage, CSRF_UNAVAILABLE_CODE);
  }

  return parsed.data.csrfToken;
}
