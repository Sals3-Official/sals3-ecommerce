import {
  SIGNED_IN_ANNOUNCEMENT,
  SIGNING_IN_ANNOUNCEMENT,
} from '@/lib/auth/login-status';

/**
 * One value rather than several booleans, so states that cannot coexist — a
 * credential alert during a redirect, or two methods pending at once — are
 * unrepresentable.
 */
export type LoginStatus =
  | { kind: 'idle' }
  | { kind: 'pending'; via: 'password' | 'google' }
  | { kind: 'error'; message: string }
  | { kind: 'success' };

export const IDLE_STATUS: LoginStatus = { kind: 'idle' };

/**
 * What the polite screen-reader region says.
 *
 * Both states are conveyed visually by something other than a live region —
 * the button's label, and a client-side route change that makes no sound at
 * all — so they have to be announced explicitly.
 */
export function getLoginAnnouncement(status: LoginStatus) {
  if (status.kind === 'success') {
    return SIGNED_IN_ANNOUNCEMENT;
  }

  return status.kind === 'pending' ? SIGNING_IN_ANNOUNCEMENT : '';
}

export function isPendingVia(
  status: LoginStatus,
  via: 'password' | 'google',
): boolean {
  return status.kind === 'pending' && status.via === via;
}
