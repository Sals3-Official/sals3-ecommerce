import type { RateLimitRule } from './rate-limit';

/**
 * Attempt budgets per auth endpoint.
 *
 * Every endpoint is throttled on two independent dimensions. Per-IP alone
 * cannot stop credential stuffing, because a botnet rotates addresses; the
 * per-email bucket is what caps guesses against one account. The per-email
 * limit is set well below the per-IP limit so the account-targeted case trips
 * first.
 */

const MINUTE_MS = 60 * 1000;

type AddressRules = {
  readonly perIp: RateLimitRule;
};

type CredentialRules = AddressRules & {
  readonly perEmail: RateLimitRule;
};

/**
 * Unchanged from the original session-cookies values. This endpoint takes an
 * ID token rather than a credential, so there is no address to bucket on.
 */
export const SESSION_POST_RULES: AddressRules = {
  perIp: { limit: 20, windowMs: MINUTE_MS },
};

export const LOGIN_RULES: CredentialRules = {
  perIp: { limit: 10, windowMs: 5 * MINUTE_MS },
  perEmail: { limit: 5, windowMs: 15 * MINUTE_MS },
};

export const SIGNUP_RULES: CredentialRules = {
  perIp: { limit: 5, windowMs: 15 * MINUTE_MS },
  perEmail: { limit: 3, windowMs: 60 * MINUTE_MS },
};

export const RATE_LIMIT_SCOPES = {
  sessionPost: 'session-post',
  login: 'login',
  signup: 'signup',
} as const;

export type RateLimitScope =
  (typeof RATE_LIMIT_SCOPES)[keyof typeof RATE_LIMIT_SCOPES];
